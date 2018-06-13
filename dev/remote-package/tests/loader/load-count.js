if (!global.loadCount) {
	global.loadCount = 0;
}

global.loadCount += 1;

module.exports = global.loadCount;
