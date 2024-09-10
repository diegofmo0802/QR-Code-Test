import ServerCore from 'saml.servercore';

const server = new ServerCore(3000);

server.addFile('/.private', 'assets/Forbiden.html');
server.addFile('/favicon.ico', 'Logo.svg');
server.addFile('/.private/*', 'assets/Forbiden.html');
server.addFolder('/', '../');