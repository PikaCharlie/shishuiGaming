const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.use(express.static('../../public_html/blockland/'));
app.use(express.static('../../public_html/libs'));
app.use(express.static('../../public_html/blockland/v3'));
app.get('/',function(req, res) {
    res.sendFile(__dirname + '../../public_html/blockland/v3/index.html');
});

// 添加物品状态管理
const worldItems = new Map();

io.sockets.on('connection', function(socket){
	socket.userData = { 
        x:0, 
        y:0, 
        z:0, 
        heading:0,
        health: 5  // 添加初始血量
    };
 
	console.log(`${socket.id} connected`);
	socket.emit('setId', { id:socket.id });
	
    socket.on('disconnect', function(){
		socket.broadcast.emit('deletePlayer', { id: socket.id });
    });	
	
	socket.on('init', function(data){
		console.log(`socket.init ${data.model}`);
		socket.userData.model = data.model;
		socket.userData.colour = data.colour;
		socket.userData.x = data.x;
		socket.userData.y = data.y;
		socket.userData.z = data.z;
		socket.userData.heading = data.h;
		socket.userData.pb = data.pb,
		socket.userData.action = "Idle";
	});
	
	socket.on('update', function(data){
		socket.userData.x = data.x;
		socket.userData.y = data.y;
		socket.userData.z = data.z;
		socket.userData.heading = data.h;
		socket.userData.pb = data.pb,
		socket.userData.action = data.action;
	});
	
	socket.on('chat message', function(data){
		console.log(`chat message:${data.id} ${data.message}`);
		io.to(data.id).emit('chat message', { id: socket.id, message: data.message });
	});

    // 添加攻击事件处理
    socket.on('playerAttack', function(data){
        console.log(`Player ${data.attackerId} attacks player ${data.targetId}`);
        // 广播攻击事件给所有玩家
        io.emit('playerAttacked', {
            attackerId: data.attackerId,
            targetId: data.targetId
        });
    });

    socket.on('playerDied', function(data) {
        socket.userData.isDead = true;
        socket.userData.action = 'Dying'; // 设置死亡动画
        
        // 广播死亡事件给所有玩家
        io.emit('playerDied', {
            id: data.id,
            action: 'Dying'
        });

        if (data.inventory) {
            socket.broadcast.emit('playerDied', {
                id: socket.id,
                inventory: data.inventory
            });
        }
    });

    // 在 socket.io 连接处理中添加
    socket.on('itemSpawned', function(data) {
        // 广播给其他玩家
        socket.broadcast.emit('itemSpawned', data);
    });

    socket.on('itemPickup', function(data) {
        console.log('Item pickup:', data);
        // 广播给所有玩家，包括拾取者
        io.emit('itemPickedUp', {
            itemId: data.itemId,
            playerId: data.playerId,
            name: data.name
        });
        worldItems.delete(data.itemId);
    });

    socket.on('itemDrop', function(data) {
        console.log('Item drop:', data);
        const itemData = {
            id: data.id,
            name: data.name,
            position: data.position,
            playerId: data.playerId
        };
        worldItems.set(data.id, itemData);
        // 广播给所有玩家，包括丢弃者
        io.emit('itemDropped', itemData);
    });

    // 当玩家连接时，发送现有物品信息
    socket.emit('initialItems', Array.from(worldItems.values()));
});

http.listen(2002,'0.0.0.0', function(){
  console.log('listening on *:2002');
});

setInterval(function(){
	const nsp = io.of('/');
    let pack = [];
	
    for(let id in io.sockets.sockets){
        const socket = nsp.connected[id];
		//Only push sockets that have been initialised
		if (socket.userData.model!==undefined){
			pack.push({
				id: socket.id,
				model: socket.userData.model,
				colour: socket.userData.colour,
				x: socket.userData.x,
				y: socket.userData.y,
				z: socket.userData.z,
				heading: socket.userData.heading,
				pb: socket.userData.pb,
				action: socket.userData.action,
                health: socket.userData.health  // 添加血量信息
			});    
		}
    }
	if (pack.length>0) io.emit('remoteData', pack);
}, 40);