# Backend Scripts

This directory contains utility scripts for managing the EV ChargerShare backend.

## Create Admin Script

The `createAdmin.js` script creates a default admin user for the system.

### Usage

#### Using Docker (recommended for production):
```bash
# Default admin
./backend/scripts/createAdminDocker.sh

# Custom admin
./backend/scripts/createAdminDocker.sh admin@company.com SecurePass123! "John Doe"
```

#### Using npm script (for local development):
```bash
npm run create-admin
```

#### Direct execution:
```bash
node scripts/createAdmin.js
```

#### With custom parameters:
```bash
# Custom email and password
node scripts/createAdmin.js --email admin@company.com --password SecurePass123!

# Custom name
node scripts/createAdmin.js --name "John Doe"

# All custom parameters
node scripts/createAdmin.js --email admin@company.com --password SecurePass123! --name "John Doe"
```

### Default Credentials

If no custom parameters are provided, the script creates an admin with:

- **Email**: `admin@evchargershare.com`
- **Password**: `Admin123!`
- **Role**: `admin`
- **Name**: `System Administrator`
- **Phone**: `1234567890`
- **Email Verified**: `true`

### Features

- ✅ Checks if admin already exists before creating
- ✅ Allows updating existing admin user
- ✅ Validates email format and password strength
- ✅ Pre-verifies admin email
- ✅ Supports custom credentials via command line arguments
- ✅ Interactive prompts for safety
- ✅ Comprehensive error handling

### Security Notes

⚠️ **IMPORTANT**: 
- Change the default password immediately after first login
- Use a strong, unique password in production
- Consider using environment variables for sensitive data

### Examples

1. **Create default admin**:
   ```bash
   npm run create-admin
   ```

2. **Create admin with custom email**:
   ```bash
   node scripts/createAdmin.js --email admin@mycompany.com
   ```

3. **Create admin with all custom details**:
   ```bash
   node scripts/createAdmin.js \
     --email admin@mycompany.com \
     --password MySecurePassword123! \
     --name "Jane Smith"
   ```

4. **Get help**:
   ```bash
   node scripts/createAdmin.js --help
   ```

### Environment Variables

The script uses the following environment variables:

- `MONGODB_URI`: MongoDB connection string (default: `mongodb://localhost:27017/evchargershare`)

### Error Handling

The script handles common errors:

- **Duplicate email**: If the email already exists
- **Connection errors**: If MongoDB is not accessible
- **Validation errors**: If user data doesn't meet schema requirements
- **Permission errors**: If the script lacks database write permissions

### Exit Codes

- `0`: Success
- `1`: Error occurred

---

## Adding New Scripts

When adding new scripts to this directory:

1. Make them executable: `chmod +x script-name.js`
2. Add a shebang line: `#!/usr/bin/env node`
3. Include proper error handling and logging
4. Add documentation to this README
5. Consider adding npm scripts in `package.json`
6. Follow the existing code style and patterns
