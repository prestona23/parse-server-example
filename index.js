// Example express application adding the parse-server module to expose Parse
// compatible API routes.

var express = require('express');
var ParseServer = require('parse-server').ParseServer;
var S3Adapter = require('parse-server').S3Adapter;
var path = require('path');

var databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI;

if (!databaseUri) {
  console.log('DATABASE_URI not specified, falling back to localhost.');
}

var api = new ParseServer({
  databaseURI: databaseUri || 'mongodb://localhost:27017/dev',
  cloud: process.env.CLOUD_CODE_MAIN || __dirname + '/cloud/main.js',
  appId: process.env.APP_ID || 'myAppId',
  masterKey: process.env.MASTER_KEY || '', //Add your master key here. Keep it secret!
  serverURL: process.env.SERVER_URL || 'http://localhost:1337/parse',  // Don't forget to change to https if needed
  maxUploadSize: '30mb',
  filesAdapter: new S3Adapter(
    process.env.S3_ACCESS_KEY || '',
    process.env.S3_SECRET_KEY || '',
    process.env.S3_BUCKET || '',
    {directAccess: true}
  ),
  push: {
    ios: [
      {
        pfx: 'push/ios/HoopSpotDevPush.p12', // Prod PFX or P12
        bundleId: 'com.mobile-software.HoopSpot',  
        production: false // Dev
      },
      {
        pfx: 'push/ios/HoopSpotProductionPush.p12', // Prod PFX or P12
        bundleId: 'com.mobile-software.HoopSpot',  
        production: true // Prod
      }
    ]
  },
  liveQuery: {
    classNames: ["Posts", "Comments"] // List of classes to support for query subscriptions
  },
  verifyUserEmails: false,
  preventLoginWithUnverifiedEmail: false,
  publicServerURL: process.env.SERVER_URL || 'http://localhost:1337/parse',
  appName: 'Hoop Spot',
  emailAdapter: {
    module: 'parse-server-simple-mailgun-adapter',
    options: {
      // The address that your emails come from
      fromAddress: process.env.MG_FROM_ADDRESS || '',
      // Your domain from mailgun.com
      domain: process.env.MG_DOMAIN || '',
      // Your API key from mailgun.com
      apiKey: process.env.MG_API_KEY || '',
    }
  }
});
// Client-keys like the javascript key or the .NET key are not necessary with parse-server
// If you wish you require them, you can set them as options in the initialization above:
// javascriptKey, restAPIKey, dotNetKey, clientKey

var app = express();

// Serve static assets from the /public folder
app.use('/public', express.static(path.join(__dirname, '/public')));

// Serve the Parse API on the /parse URL prefix
var mountPath = process.env.PARSE_MOUNT || '/parse';
app.use(mountPath, api);

// Parse Server plays nicely with the rest of your web routes
app.get('/', function(req, res) {
  res.status(200).send('I dream of being a website.  Please star the parse-server repo on GitHub!');
});

// There will be a test page available on the /test path of your server url
// Remove this before launching your app
app.get('/test', function(req, res) {
  res.sendFile(path.join(__dirname, '/public/test.html'));
});

var port = process.env.PORT || 1337;
var httpServer = require('http').createServer(app);
httpServer.listen(port, function() {
    console.log('parse-server-example running on port ' + port + '.');
});

// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);
