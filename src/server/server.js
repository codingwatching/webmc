// Generated by CoffeeScript 2.5.1
(function() {
  module.exports = function(mode) {
    var Chunk, Convert, app, config, convert, express, fs, http, io, mineflayer, opn, port, server, sf, socketInfo, vec3;
    //biblioteki
    opn = require("opn");
    fs = require("fs");
    config = JSON.parse(fs.readFileSync(`${__dirname}/server.json`));
    http = require("http");
    express = require('express');
    app = express();
    server = http.createServer(app);
    io = require("socket.io")(server);
    mineflayer = require('mineflayer');
    Chunk = require("prismarine-chunk")(config.version);
    vec3 = require("vec3");
    Convert = require('ansi-to-html');
    convert = new Convert();
    //początkowe zmienne
    sf = {};
    socketInfo = {};
    if (mode === "production") {
      port = process.env.PORT || 8080;
      app.use(express.static(`${__dirname}/../client/dist`));
    } else {
      port = 8081;
    }
    //Konfiguracja serwera express
    server.listen(port, function() {
      return console.log(`Server is running on \x1b[34m*:${port}\x1b[0m`);
    });
    //websocket
    io.sockets.on("connection", function(socket) {
      var bot;
      socketInfo[socket.id] = {};
      bot = socketInfo[socket.id];
      socket.on("initClient", function(data) {
        var botEventMap, emit, i, inv, socketEventMap, war;
        console.log("[\x1b[32m+\x1b[0m] " + data.nick);
        //Dodawanie informacji o graczu do socketInfo
        socketInfo[socket.id] = data;
        socketInfo[socket.id].bot = mineflayer.createBot({
          host: config.ip,
          port: config.port,
          username: socketInfo[socket.id].nick,
          version: config.version
        });
        bot = function() {
          if (socketInfo[socket.id] !== void 0) {
            return socketInfo[socket.id].bot;
          } else {
            return null;
          }
        };
        emit = function(array) {
          return io.to(socket.id).emit(...array);
        };
        //Eventy otrzymywane z serwera minecraftowego
        war = true;
        bot()._client.on("map_chunk", function(packet) {
          var cell, i, j, light;
          cell = new Chunk();
          cell.load(packet.chunkData, packet.bitMap, true, true);
          for (i = j = 0; j <= 255; i = ++j) {
            light = cell.getBlockLight(0, i, 0);
            if (light !== 0) {
              console.log(light);
              break;
            }
          }
          // emit ["dimension",bot().game.dimension]
          emit(["mapChunk", cell.sections, packet.x, packet.z, packet.biomes]);
        });
        bot()._client.on("respawn", function(packet) {
          emit(["dimension", packet.dimension.value.effects.value]);
        });
        botEventMap = {
          "login": function() {
            emit(["dimension", bot().game.dimension]);
          },
          "move": function() {
            emit(["move", bot().entity.position]);
          },
          "health": function() {
            emit(["hp", bot().health]);
            emit(["food", bot().food]);
          },
          "spawn": function() {
            // diamond=bot().inventory.slots[36]
            // ac=bot().inventory.slots[37]
            // console.log diamond,ac
            // bot().equip ac,"hand"
            // bot().heldItem.slot=37
            // console.log bot().updateHeldItem()
            // console.log bot().heldItem
            emit(["spawn", bot().entity.yaw, bot().entity.pitch]);
          },
          "kicked": function(reason, loggedIn) {
            emit(["kicked", reason]);
          },
          "message": function(msg) {
            emit(["msg", convert.toHtml(msg.toAnsi())]);
          },
          "experience": function() {
            emit(["xp", bot().experience]);
          },
          "blockUpdate": function(oldb, newb) {
            emit(["blockUpdate", [newb.position.x, newb.position.y, newb.position.z, newb.stateId]]);
          },
          "diggingCompleted": function(block) {
            emit(["diggingCompleted", block]);
          },
          "diggingAborted": function(block) {
            emit(["diggingAborted", block]);
          }
        };
        for (i in botEventMap) {
          (function(i) {
            return socketInfo[socket.id].bot.on(i, function() {
              if (bot() !== null) {
                botEventMap[i](...arguments);
              }
            });
          })(i);
        }
        inv = "";
        socketInfo[socket.id].int = setInterval(function() {
          var inv_new;
          inv_new = JSON.stringify(bot().inventory.slots);
          if (inv !== inv_new) {
            inv = inv_new;
            emit(["inventory", bot().inventory.slots]);
          }
          emit(["entities", bot().entities]);
        }, 10);
        socketEventMap = {
          "blockPlace": function(pos, vec) {
            var block, vecx;
            block = bot().blockAt(new vec3(...pos));
            console.log(block);
            vecx = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]];
            bot().placeBlock(block, new vec3(...vec), function(r) {
              console.log(r);
            });
          },
          "invc": function(num) {
            var item;
            item = bot().inventory.slots[num + 36];
            if (item !== null) {
              console.log(item);
              try {
                bot().equip(item, "hand");
              } catch (error) {}
            } else {
              bot().unequip("hand");
            }
          },
          "move": function(state, toggle) {
            bot().setControlState(state, toggle);
          },
          "command": function(com) {
            bot().chat(com);
          },
          "rotate": function(data) {
            bot().look(...data);
          },
          "disconnect": function() {
            try {
              clearInterval(socketInfo[socket.id].int);
              console.log("[\x1b[31m-\x1b[0m] " + socketInfo[socket.id].nick);
              socketInfo[socket.id].bot.end();
              delete socketInfo[socket.id];
            } catch (error) {}
          },
          "dig": function(pos) {
            var block, digTime;
            block = bot().blockAt(vec3(pos[0], pos[1] - 16, pos[2]));
            if (block !== null) {
              digTime = bot().digTime(block);
              if (bot().targetDigBlock !== null) {
                console.log("Already digging...");
                bot().stopDigging();
              }
              emit(["digTime", digTime, block]);
              console.log("Start");
              bot().dig(block, false, function(xd) {
                if (xd === void 0) {
                  return console.log("SUCCESS");
                } else {
                  return console.log("FAIL");
                }
              });
            }
          },
          "stopDigging": function(callback) {
            bot().stopDigging();
          }
        };
        for (i in socketEventMap) {
          socket.on(i, socketEventMap[i]);
        }
      });
    });
  };

}).call(this);
