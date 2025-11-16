const request = require('supertest');
const app = require('../server');

describe('Server Setup', () => {
  test('Health check endpoint should return 200', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('EvChargerShare API is running');
  });

  test('Non-existent route should return 404', async () => {
    const response = await request(app)
      .get('/api/nonexistent')
      .expect(404);

    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});