import Server from '../src/server';

const server = new Server({
	root: 'dev/remote-package'
});

server.install().then(() => server.listen());
