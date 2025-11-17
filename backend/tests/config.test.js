const path = require('path');
const fs = require('fs');

describe('Project Configuration', () => {
  test('Environment example file exists', () => {
    const envExamplePath = path.join(__dirname, '..', '.env.example');
    expect(fs.existsSync(envExamplePath)).toBe(true);
  });

  test('Database config file exists', () => {
    const dbConfigPath = path.join(__dirname, '..', 'config', 'database.js');
    expect(fs.existsSync(dbConfigPath)).toBe(true);
  });

  test('Error handler middleware exists', () => {
    const errorHandlerPath = path.join(__dirname, '..', 'middleware', 'errorHandler.js');
    expect(fs.existsSync(errorHandlerPath)).toBe(true);
  });

  test('Required directories exist', () => {
    const requiredDirs = ['models', 'routes', 'services', 'utils', 'tests'];
    requiredDirs.forEach(dir => {
      const dirPath = path.join(__dirname, '..', dir);
      expect(fs.existsSync(dirPath)).toBe(true);
    });
  });
});