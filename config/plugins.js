// module.exports = {
//     // ...
//     'repositories': {
//       enabled: true,
//       resolve: './src/plugins/repositories'
//     },
    
//     // ...
//   }

module.exports = () => {
  
    return {
        ckeditor: true,
        'repositories': {
          enabled: true,
          resolve: './src/plugins/repositories'
        },
        graphql: {
          endpoint: '/graphql',
          shadowCRUD: true,
          playgroundAlways: false,
          depthLimit: 7,
          amountLimit: 10000,
          disabledPlugins: [],
          disabledExtensions: [],
          apolloServer: {
            tracing: true,
          },
        },
    }
}