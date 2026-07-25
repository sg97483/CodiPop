const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  server: {
    enhanceMiddleware: (middleware) => {
      return (req, res, next) => {
        // symbolicate 요청에서 undefined 처리
        if (req.url && req.url.includes('symbolicate')) {
          // 요청 본문이 비어있거나 undefined인 경우 처리
          if (!req.body || req.body === undefined) {
            console.warn('Symbolicate request with undefined body, returning empty stack');
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({stack: []}));
            return;
          }
          
          // 요청 본문을 안전하게 파싱
          try {
            if (typeof req.body === 'string') {
              const parsed = JSON.parse(req.body);
              if (!parsed || parsed.stack === undefined) {
                res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({stack: []}));
                return;
              }
            }
            return middleware(req, res, next);
          } catch (error) {
            console.warn('Symbolicate parsing error:', error);
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify({stack: []}));
            return;
          }
        }
        return middleware(req, res, next);
      };
    },
  },
  transformer: {
    // 소스맵 생성 최적화
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
