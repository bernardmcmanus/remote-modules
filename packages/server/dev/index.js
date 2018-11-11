require('@babel/register')({
	configFile: '../../babel.config.js',
	extensions: ['.js', '.ts']
});

require('./server');
