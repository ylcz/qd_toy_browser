const http = require('http');

http.createServer((req, res) => {
    console.log("request received");
    console.log(req.headers);
    res.setHeader("Content-Type", "text/html");
    res.setHeader("x-Foo", "bar");
    res.writeHead(200, {'Content-Type' : 'text/plain'});
    res.end(
`<html maaa=a >
<head>
    <style>
body div #myid{
    width: 100px;
    background-color: #ff5000;
}
body div img{
    width: 30px;
    background-color: #ff1111;
}
    </style>
</head>
<body>
    <div>
        <img id="myid"/>
        <img class="cscs" />
    </div>
</body>
</html>`);
}).listen(8088);

console.log('server started\n');
