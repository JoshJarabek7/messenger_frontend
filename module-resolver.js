/* 
 * This is a custom module resolver plugin for webpack
 * It helps resolve @/ path aliases correctly in Vercel deployments
 */

class ModuleResolverPlugin {
  constructor(options) {
    this.options = options || {};
    this.alias = this.options.alias || {};
  }

  apply(resolver) {
    const target = resolver.ensureHook('resolve');
    
    resolver.getHook('described-resolve').tapAsync(
      'ModuleResolverPlugin', 
      (request, resolveContext, callback) => {
        if (request.request && request.request.startsWith('@/')) {
          // Handle @/ path alias
          const path = request.request.substring(2);
          
          // Try to resolve the path directly first
          resolver.doResolve(
            target,
            {
              ...request,
              request: './' + path
            },
            null,
            resolveContext,
            (err, result) => {
              if (!err && result) {
                return callback(null, result);
              }
              
              // If direct resolution fails, try node_modules/@/ path
              resolver.doResolve(
                target,
                {
                  ...request,
                  request: 'node_modules/@/' + path
                },
                null,
                resolveContext,
                (err2, result2) => {
                  if (!err2 && result2) {
                    return callback(null, result2);
                  }
                  
                  // If that fails too, continue with normal resolution
                  callback();
                }
              );
            }
          );
        } else {
          // For other imports, continue with normal resolution
          callback();
        }
      }
    );
  }
}

module.exports = ModuleResolverPlugin;