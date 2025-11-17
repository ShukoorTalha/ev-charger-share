const Charger = require('../models/Charger');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/errors');
const { uploadMultipleToS3, deleteFromS3, getMultipleSignedUrls } = require('../utils/s3Upload');

/**
 * Transform charger data to include signed URLs for images
 * @param {Object} charger - Charger document
 * @returns {Object} - Transformed charger with signed URLs
 */
const transformChargerWithSignedUrls = async (charger) => {
  const chargerObj = charger.toObject ? charger.toObject() : charger;
  
  if (chargerObj.images && chargerObj.images.length > 0) {
    try {
      // Filter out any empty or invalid keys
      const validKeys = chargerObj.images.filter(key => key && typeof key === 'string');
      
      if (validKeys.length > 0) {
        // Generate signed URLs for S3 keys, keep full URLs as is
        const signedUrls = await Promise.all(
          validKeys.map(async (key) => {
            if (key.startsWith('http')) {
              // Already a full URL, return as is
              return key;
            } else {
              // S3 key, generate signed URL
              try {
                const { getSignedUrl } = require('../utils/s3Upload');
                return await getSignedUrl(key);
              } catch (error) {
                console.error('Error generating signed URL for key:', key, error);
                return null;
              }
            }
          })
        );
        
        // Filter out any null URLs
        chargerObj.images = signedUrls.filter(url => url !== null);
      }
    } catch (error) {
      console.error('Error transforming charger images:', error);
      chargerObj.images = [];
    }
  }
  
  return chargerObj;
};

/**
 * Search chargers with filters and geospatial queries
 * @route GET /api/chargers
 * @access Public
 */
exports.searchChargers = async (req, res, next) => {
  try {
    const {
      lat,
      lng,
      distance = 10, // km
      type,
      connector,
      minPower,
      maxPrice,
      page = 1,
      limit = 10,
      sortBy = 'distance'
    } = req.query;

    // Build query
    const query = { status: 'approved' };

    // Filter by charger type
    if (type) {
      query['specifications.type'] = type;
    }

    // Filter by connector type
    if (connector) {
      query['specifications.connector'] = connector;
    }

    // Filter by minimum power
    if (minPower) {
      query['specifications.power'] = { $gte: parseFloat(minPower) };
    }

    // Filter by maximum price
    if (maxPrice) {
      query['pricing.hourlyRate'] = { $lte: parseFloat(maxPrice) };
    }

    // Geospatial query if coordinates provided
    let geoNear = null;
    if (lat && lng) {
      geoNear = {
        $geoNear: {
          near: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          distanceField: 'distance',
          maxDistance: parseInt(distance) * 1000, // convert km to meters
          spherical: true
        }
      };
    }

    // Build aggregation pipeline
    const pipeline = [];

    // Add geospatial stage if coordinates provided
    if (geoNear) {
      pipeline.push(geoNear);
    }

    // Add match stage for filters
    pipeline.push({ $match: query });

    // Add sort stage
    if (sortBy === 'distance' && geoNear) {
      // Already sorted by distance from geoNear
    } else if (sortBy === 'price') {
      pipeline.push({ $sort: { 'pricing.hourlyRate': 1 } });
    } else if (sortBy === 'rating') {
      pipeline.push({ $sort: { 'ratings.average': -1 } });
    } else {
      pipeline.push({ $sort: { createdAt: -1 } });
    }

    // Add pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: parseInt(limit) });

    // Add lookup for owner details
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'owner',
        foreignField: '_id',
        as: 'ownerDetails',
        pipeline: [
          { $project: { 'profile.firstName': 1, 'profile.lastName': 1, 'profile.avatar': 1, 'ratings': 1 } }
        ]
      }
    });
    pipeline.push({ $unwind: { path: '$ownerDetails', preserveNullAndEmptyArrays: true } });

    // Execute aggregation
    const chargers = await Charger.aggregate(pipeline);
    
    // Transform chargers to include signed URLs
    const transformedChargers = await Promise.all(
      chargers.map(charger => transformChargerWithSignedUrls(charger))
    );

    // Get total count
    const countPipeline = [];
    if (geoNear) {
      countPipeline.push(geoNear);
    }
    countPipeline.push({ $match: query });
    countPipeline.push({ $count: 'total' });
    
    const countResult = await Charger.aggregate(countPipeline);
    const total = countResult.length > 0 ? countResult[0].total : 0;

    res.status(200).json({
      success: true,
      data: {
        chargers: transformedChargers,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get charger by ID
 * @route GET /api/chargers/:id
 * @access Public
 */
exports.getChargerById = async (req, res, next) => {
  try {
    const charger = await Charger.findById(req.params.id).populate({
      path: 'owner',
      select: 'profile.firstName profile.lastName profile.avatar ratings'
    });

    if (!charger) {
      throw new NotFoundError('Charger not found');
    }

    // If charger is not approved, only owner and admin can view it
    if (charger.status !== 'approved') {
      const isOwner = req.user && charger.owner.equals(req.user.id);
      const isAdmin = req.user && req.user.role === 'admin';

      if (!isOwner && !isAdmin) {
        throw new NotFoundError('Charger not found');
      }
    }

    // Transform charger to include signed URLs
    const transformedCharger = await transformChargerWithSignedUrls(charger);
    
    res.status(200).json({
      success: true,
      data: transformedCharger
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new charger
 * @route POST /api/chargers
 * @access Private (charger_owner, admin)
 */
exports.createCharger = async (req, res, next) => {
  try {
    console.log('Create charger request body:', req.body);
    console.log('Create charger request files:', req.files);
    
    const {
      title,
      description,
      address,
      coordinates,
      accessInstructions,
      type,
      connector,
      power,
      voltage,
      amperage,
      hourlyRate,
      currency,
      amenities
    } = req.body;
    
    // Parse coordinates if it's a string
    let parsedCoordinates = coordinates;
    if (typeof coordinates === 'string') {
      try {
        parsedCoordinates = JSON.parse(coordinates);
      } catch (e) {
        // Try to parse as comma-separated string
        const coordParts = coordinates.split(',').map(part => parseFloat(part.trim()));
        if (coordParts.length === 2 && !isNaN(coordParts[0]) && !isNaN(coordParts[1])) {
          parsedCoordinates = coordParts;
        } else {
          parsedCoordinates = [0, 0]; // Default coordinates
        }
      }
    }
    
    // Ensure coordinates is an array with two valid numbers
    if (!Array.isArray(parsedCoordinates) || 
        parsedCoordinates.length !== 2 || 
        isNaN(parsedCoordinates[0]) || 
        isNaN(parsedCoordinates[1])) {
      parsedCoordinates = [0, 0]; // Default coordinates
    }
    
    // Handle amenities array from FormData
    let parsedAmenities = amenities;
    if (typeof amenities === 'string') {
      try {
        // Try to parse as JSON first
        parsedAmenities = JSON.parse(amenities);
      } catch (e) {
        // Fallback to comma-separated string
        parsedAmenities = amenities.split(',').map(a => a.trim());
      }
    } else if (Array.isArray(amenities)) {
      parsedAmenities = amenities;
    } else {
      parsedAmenities = [];
    }

    // Process uploaded images if any
    const imageKeys = [];
    if (req.files && req.files.length > 0) {
      console.log(`Processing ${req.files.length} uploaded images`);
      try {
        // Upload files to S3 and get S3 keys
        const s3Keys = await uploadMultipleToS3(req.files, 'chargers');
        imageKeys.push(...s3Keys);
        console.log('Uploaded images to S3 with keys:', s3Keys);
      } catch (error) {
        console.error('Error uploading images to S3:', error);
        throw new BadRequestError('Failed to upload images');
      }
    }
    
    // Create charger
    const charger = new Charger({
      owner: req.user.id,
      title,
      description,
      location: {
        address,
        coordinates: parsedCoordinates,
        accessInstructions
      },
      specifications: {
        type,
        connector,
        power: parseFloat(power),
        voltage: voltage ? parseFloat(voltage) : undefined,
        amperage: amperage ? parseFloat(amperage) : undefined
      },
      pricing: {
        hourlyRate: parseFloat(hourlyRate),
        currency: currency || 'USD'
      },
      amenities: parsedAmenities,
      images: imageKeys,
      status: req.user.role === 'admin' ? 'approved' : 'pending'
    });

    await charger.save();

    // Transform charger to include signed URLs
    const transformedCharger = await transformChargerWithSignedUrls(charger);

    res.status(201).json({
      success: true,
      data: transformedCharger
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update charger
 * @route PUT /api/chargers/:id
 * @access Private (owner of charger, admin)
 */
exports.updateCharger = async (req, res, next) => {
  try {
    const charger = await Charger.findById(req.params.id);

    if (!charger) {
      throw new NotFoundError('Charger not found');
    }

    // Check ownership
    const isOwner = charger.owner.equals(req.user.id);
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError('Not authorized to update this charger');
    }

    // Build update object
    const updateData = {};
    
    // Log the request body to debug
    console.log('Update request body:', req.body);
    
    // Handle both flat and nested structure
    let title, description, address, coordinates, accessInstructions,
        type, connector, power, voltage, amperage,
        hourlyRate, currency, amenities;
        
    // Extract from nested structure if present
    if (req.body.location) {
      // Nested structure (from frontend JSON)
      ({ title, description } = req.body);
      ({ address, coordinates, accessInstructions } = req.body.location || {});
      ({ type, connector, power, voltage, amperage } = req.body.specifications || {});
      ({ hourlyRate, currency } = req.body.pricing || {});
      ({ amenities } = req.body);
    } else {
      // Flat structure (from form data or direct API call)
      ({ 
        title, description, address, coordinates, accessInstructions,
        type, connector, power, voltage, amperage,
        hourlyRate, currency, amenities
      } = req.body);
    }

    // Basic info
    if (title) updateData.title = title;
    if (description) updateData.description = description;

    // Location
    if (address) updateData['location.address'] = address;
    
    // Handle coordinates parsing and validation
    if (coordinates) {
      let parsedCoordinates = coordinates;
      
      // Parse coordinates if it's a string
      if (typeof coordinates === 'string') {
        try {
          parsedCoordinates = JSON.parse(coordinates);
        } catch (e) {
          // Try to parse as comma-separated string
          const coordParts = coordinates.split(',').map(part => parseFloat(part.trim()));
          if (coordParts.length === 2 && !isNaN(coordParts[0]) && !isNaN(coordParts[1])) {
            parsedCoordinates = coordParts;
          } else {
            // Keep existing coordinates if parsing fails
            parsedCoordinates = charger.location.coordinates;
          }
        }
      }
      
      // Validate coordinates
      if (Array.isArray(parsedCoordinates) && 
          parsedCoordinates.length === 2 && 
          !isNaN(parsedCoordinates[0]) && 
          !isNaN(parsedCoordinates[1])) {
        updateData['location.coordinates'] = parsedCoordinates;
      }
    }
    
    if (accessInstructions) updateData['location.accessInstructions'] = accessInstructions;

    // Specifications
    if (type) updateData['specifications.type'] = type;
    if (connector) updateData['specifications.connector'] = connector;
    if (power) updateData['specifications.power'] = power;
    if (voltage) updateData['specifications.voltage'] = voltage;
    if (amperage) updateData['specifications.amperage'] = amperage;

    // Pricing
    if (hourlyRate) updateData['pricing.hourlyRate'] = hourlyRate;
    if (currency) updateData['pricing.currency'] = currency;

    // Amenities - handle different input formats
    if (amenities) {
      let parsedAmenities = amenities;
      
      // Parse amenities if it's a string
      if (typeof amenities === 'string') {
        try {
          // Try to parse as JSON first
          parsedAmenities = JSON.parse(amenities);
        } catch (e) {
          // Fallback to comma-separated string
          parsedAmenities = amenities.split(',').map(a => a.trim());
        }
      }
      
      // Filter to only valid amenities
      const validAmenities = ['covered', 'security_camera', 'restroom', 'wifi', 'parking', 'lighting'];
      
      // Map common variations and filter to valid values
      if (Array.isArray(parsedAmenities)) {
        updateData.amenities = parsedAmenities
          .map(amenity => {
            const a = amenity.trim().toLowerCase();
            // Map common variations to valid values
            const amenityMap = {
              'wifi': 'wifi',
              'wi-fi': 'wifi',
              'parking': 'parking',
              'covered': 'covered',
              'security': 'security_camera',
              'security_camera': 'security_camera',
              'restroom': 'restroom',
              'bathroom': 'restroom',
              'lighting': 'lighting',
              'lights': 'lighting'
            };
            return amenityMap[a] || a;
          })
          .filter(a => validAmenities.includes(a));
      }
    }

    // If non-admin makes significant changes, set status back to pending
    if (!isAdmin && (
      updateData['specifications.type'] || 
      updateData['specifications.connector'] || 
      updateData['specifications.power'] ||
      updateData['location.coordinates']
    )) {
      updateData.status = 'pending';
    }
    
    // Handle image updates
    let finalImages = charger.images || [];
    
    // Handle existing images from frontend
    if (req.body.existingImages) {
      try {
        const existingImages = JSON.parse(req.body.existingImages);
        console.log('Existing images from frontend:', existingImages);
        
        // Find images to delete (ones that were removed)
        const currentImages = charger.images || [];
        const imagesToDelete = currentImages.filter(img => !existingImages.includes(img));
        
        // Delete removed images from S3
        if (imagesToDelete.length > 0) {
          console.log('Deleting removed images from S3:', imagesToDelete);
          for (const imageKey of imagesToDelete) {
            try {
              await deleteFromS3(imageKey);
              console.log('Deleted image from S3:', imageKey);
            } catch (error) {
              console.error('Error deleting image from S3:', error);
              // Continue even if deletion fails
            }
          }
        }
        
        finalImages = existingImages;
      } catch (error) {
        console.error('Error parsing existing images:', error);
      }
    }
    
    // Process new uploaded images
    if (req.files && req.files.length > 0) {
      console.log(`Processing ${req.files.length} new uploaded images`);
      
      try {
        // Upload new files to S3 and get S3 keys
        const newS3Keys = await uploadMultipleToS3(req.files, 'chargers');
        console.log('Uploaded new images to S3 with keys:', newS3Keys);
        
        // Combine existing and new images
        finalImages = [...finalImages, ...newS3Keys];
        console.log('Final images array:', finalImages);
      } catch (error) {
        console.error('Error uploading images to S3:', error);
        throw new BadRequestError('Failed to upload images');
      }
    }
    
    // Update images if they changed
    if (req.body.existingImages || (req.files && req.files.length > 0)) {
      updateData.images = finalImages;
    }

    // Update charger
    const updatedCharger = await Charger.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    // Transform charger to include signed URLs
    const transformedCharger = await transformChargerWithSignedUrls(updatedCharger);

    res.status(200).json({
      success: true,
      data: transformedCharger
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete charger
 * @route DELETE /api/chargers/:id
 * @access Private (owner of charger, admin)
 */
exports.deleteCharger = async (req, res, next) => {
  try {
    const charger = await Charger.findById(req.params.id);

    if (!charger) {
      throw new NotFoundError('Charger not found');
    }

    // Check ownership
    const isOwner = charger.owner.equals(req.user.id);
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError('Not authorized to delete this charger');
    }

    // TODO: Check if charger has active bookings before deletion

    // Delete charger images from S3
    if (charger.images && charger.images.length > 0) {
      for (const imageKey of charger.images) {
        try {
          // Delete S3 images (both keys and URLs for backward compatibility)
          await deleteFromS3(imageKey);
          console.log('Deleted image from S3:', imageKey);
        } catch (error) {
          console.error('Error deleting image from S3:', error);
          // Continue with deletion even if image deletion fails
        }
      }
    }

    await charger.remove();

    res.status(200).json({
      success: true,
      message: 'Charger deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload charger images
 * @route POST /api/chargers/:id/images
 * @access Private (owner of charger, admin)
 */
exports.uploadChargerImages = async (req, res, next) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      throw new BadRequestError('No images uploaded');
    }

    const charger = await Charger.findById(req.params.id);

    if (!charger) {
      throw new NotFoundError('Charger not found');
    }

    // Check ownership
    const isOwner = charger.owner.equals(req.user.id);
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError('Not authorized to update this charger');
    }

    // Process uploaded images
    const uploadedKeys = [];
    
    if (req.files && req.files.length > 0) {
      try {
        // Upload files to S3 and get S3 keys
        const s3Keys = await uploadMultipleToS3(req.files, 'chargers');
        uploadedKeys.push(...s3Keys);
        console.log('Uploaded images to S3 with keys:', s3Keys);
      } catch (error) {
        console.error('Error uploading images to S3:', error);
        throw new BadRequestError('Failed to upload images');
      }
    } else {
      throw new BadRequestError('No images uploaded');
    }

    // Update charger with new images
    charger.images = [...(charger.images || []), ...uploadedKeys];
    await charger.save();

    // Transform charger to include signed URLs
    const transformedCharger = await transformChargerWithSignedUrls(charger);

    res.status(200).json({
      success: true,
      data: {
        images: transformedCharger.images
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete charger image
 * @route DELETE /api/chargers/:id/images/:imageId
 * @access Private (owner of charger, admin)
 */
exports.deleteChargerImage = async (req, res, next) => {
  try {
    // Extract imageId from wildcard parameter
    const imageId = req.params[0];
    
    const charger = await Charger.findById(req.params.id);

    if (!charger) {
      console.log('ERROR: Charger not found');
      throw new NotFoundError('Charger not found');
    }

    // Check ownership
    const isOwner = charger.owner.equals(req.user.id);
    const isAdmin = req.user.role === 'admin' || req.user.role === 'charger_owner';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError('Not authorized to update this charger');
    }

    // Find image by imageId (could be S3 key or part of signed URL)
    let imageIndex = -1;
    let imageToDelete = null;
    
    // Try to find by exact match first (S3 key)
    imageIndex = charger.images.findIndex(img => img === imageId);
    
    // If not found, try to find by partial match (for signed URLs)
    if (imageIndex === -1) {
      imageIndex = charger.images.findIndex(img => {
        // Extract S3 key from signed URL if needed
        if (imageId.includes('amazonaws.com')) {
          const urlParts = imageId.split('/');
          const keyPart = urlParts.slice(-2).join('/'); // Get 'chargers/filename.ext'
          return img === keyPart || img.includes(keyPart);
        }
        return img.includes(imageId);
      });
    }

    if (imageIndex === -1) {
      throw new NotFoundError('Image not found');
    }

    imageToDelete = charger.images[imageIndex];
    console.log('Deleting image:', imageToDelete);

    // Delete image from S3
    try {
      await deleteFromS3(imageToDelete);
      console.log('Successfully deleted image from S3:', imageToDelete);
    } catch (error) {
      console.error('Error deleting image from S3:', error);
      // Continue with removal from DB even if S3 deletion fails
    }

    // Remove image from charger
    charger.images.splice(imageIndex, 1);
    await charger.save();

    // Transform remaining images to include signed URLs
    const transformedCharger = await transformChargerWithSignedUrls(charger);

    res.status(200).json({
      success: true,
      data: {
        images: transformedCharger.images
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update charger availability
 * @route PUT /api/chargers/:id/availability
 * @access Private (owner of charger, admin)
 */
exports.updateAvailability = async (req, res, next) => {
  try {
    const { schedule, blockedDates } = req.body;

    const charger = await Charger.findById(req.params.id);

    if (!charger) {
      throw new NotFoundError('Charger not found');
    }

    // Check ownership
    const isOwner = charger.owner.equals(req.user.id);
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError('Not authorized to update this charger');
    }

    // Update availability
    if (schedule) {
      charger.availability.schedule = schedule;
    }

    if (blockedDates) {
      charger.availability.blockedDates = blockedDates;
    }

    await charger.save();

    res.status(200).json({
      success: true,
      data: charger.availability
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get owner's chargers
 * @route GET /api/chargers/owner/listings
 * @access Private
 */
exports.getOwnerChargers = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    // Build query
    const query = { owner: req.user.id };

    if (status) {
      query.status = status;
    }

    // Execute query with pagination
    const chargers = await Charger.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Get total count
    const total = await Charger.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        chargers,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get owner stats
 * @route GET /api/chargers/owner/stats
 * @access Private
 */
exports.getOwnerStats = async (req, res, next) => {
  try {
    const stats = await Charger.aggregate([
      { $match: { owner: req.user._id } },
      { $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Format stats
    const formattedStats = {
      total: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
      inactive: 0
    };

    stats.forEach(stat => {
      formattedStats[stat._id] = stat.count;
      formattedStats.total += stat.count;
    });

    res.status(200).json({
      success: true,
      data: formattedStats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update charger status (admin only)
 * @route PUT /api/chargers/:id/status
 * @access Private (admin)
 */
exports.updateChargerStatus = async (req, res, next) => {
  try {
    const { status, rejectionReason } = req.body;

    if (!['pending', 'approved', 'rejected', 'inactive'].includes(status)) {
      throw new BadRequestError('Invalid status value');
    }

    const charger = await Charger.findById(req.params.id);

    if (!charger) {
      throw new NotFoundError('Charger not found');
    }

    // Update status
    charger.status = status;
    
    // Add rejection reason if status is rejected
    if (status === 'rejected' && rejectionReason) {
      charger.rejectionReason = rejectionReason;
    }

    await charger.save();

    // TODO: Send notification to owner about status change

    res.status(200).json({
      success: true,
      data: charger
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get pending chargers (admin only)
 * @route GET /api/chargers/admin/pending
 * @access Private (admin)
 */
exports.getPendingChargers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    // Execute query with pagination
    const chargers = await Charger.find({ status: 'pending' })
      .populate({
        path: 'owner',
        select: 'profile.firstName profile.lastName profile.avatar email'
      })
      .sort({ createdAt: 1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Get total count
    const total = await Charger.countDocuments({ status: 'pending' });

    res.status(200).json({
      success: true,
      data: {
        chargers,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
