const fs = require('fs');
const path = require('path');

const ALLOWED_PUBLIC_ENV_KEYS = new Set([
  'ARTHA_API_BASE_URL',
  'ARTHA_GOOGLE_WEB_CLIENT_ID',
  'ARTHA_GOOGLE_IOS_CLIENT_ID',
  'ARTHA_APPLE_SERVICE_ID',
]);

function isSafePublicEnvKey(key) {
  if (!ALLOWED_PUBLIC_ENV_KEYS.has(key)) {
    return false;
  }
  const upper = key.toUpperCase();
  return (
    !upper.includes('SECRET') &&
    !upper.includes('PASSWORD') &&
    !upper.includes('PRIVATE') &&
    !upper.includes('DATABASE') &&
    !upper.includes('SMTP')
  );
}

function loadDotEnvFiles() {
  const envVars = {};
  const isProd = process.env.NODE_ENV === 'production';
  const files = isProd
    ? ['.env', '.env.local', '.env.production']
    : ['.env', '.env.production', '.env.local'];

  for (const filename of files) {
    const filePath = path.resolve(__dirname, filename);
    if (!fs.existsSync(filePath)) {
      continue;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) {
        continue;
      }
      const eqIdx = line.indexOf('=');
      if (eqIdx === -1) {
        continue;
      }
      const key = line.slice(0, eqIdx).trim();
      let value = line.slice(eqIdx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (isSafePublicEnvKey(key)) {
        envVars[key] = value;
        if (process.env.NODE_ENV !== 'test' && !process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }

  return envVars;
}

loadDotEnvFiles();

function arthaDotEnvInlinePlugin({ types: t }) {
  return {
    name: 'artha-dotenv-inline',
    visitor: {
      MemberExpression(nodePath) {
        if (process.env.NODE_ENV === 'test') {
          return;
        }
        const { node } = nodePath;
        if (
          node.computed ||
          !t.isIdentifier(node.property) ||
          !isSafePublicEnvKey(node.property.name)
        ) {
          return;
        }

        const isProcessEnv =
          t.isMemberExpression(node.object) &&
          t.isIdentifier(node.object.object, { name: 'process' }) &&
          t.isIdentifier(node.object.property, { name: 'env' });

        if (!isProcessEnv) {
          return;
        }

        const loadedEnv = loadDotEnvFiles();
        const key = node.property.name;
        const val =
          process.env[key] !== undefined
            ? process.env[key]
            : loadedEnv[key] !== undefined
              ? loadedEnv[key]
              : '';

        if (t.isOptionalMemberExpression(nodePath.parent)) {
          nodePath.parentPath.replaceWith(t.stringLiteral(String(val)));
        } else {
          nodePath.replaceWith(t.stringLiteral(String(val)));
        }
      },
      OptionalMemberExpression(nodePath) {
        if (process.env.NODE_ENV === 'test') {
          return;
        }
        const { node } = nodePath;
        if (
          node.computed ||
          !t.isIdentifier(node.property) ||
          !isSafePublicEnvKey(node.property.name)
        ) {
          return;
        }

        const isProcessEnv =
          t.isMemberExpression(node.object) &&
          t.isIdentifier(node.object.object, { name: 'process' }) &&
          t.isIdentifier(node.object.property, { name: 'env' });

        if (!isProcessEnv) {
          return;
        }

        const loadedEnv = loadDotEnvFiles();
        const key = node.property.name;
        const val =
          process.env[key] !== undefined
            ? process.env[key]
            : loadedEnv[key] !== undefined
              ? loadedEnv[key]
              : '';

        nodePath.replaceWith(t.stringLiteral(String(val)));
      },
    },
  };
}

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [arthaDotEnvInlinePlugin],
};
