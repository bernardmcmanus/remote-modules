module.exports = process.browser ? require('./browser') : require('./node');
