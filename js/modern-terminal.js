// Modern Terminal JavaScript
(function () {
  'use strict';



  // Terminal state
  let terminalState = {
    connected: false,
    nickname: null,
    currentRoom: null,
    wsClient: null,
    commandHistory: [],
    historyIndex: -1,
    availableRooms: [], // 存储可用房间列表
    countdownTimer: null, // 倒计时定时器
    countdownElement: null, // 倒计时显示元素
    isMyTurn: false, // 是否轮到我行动
    currentRound: '', // 当前回合阶段
    roomCreationState: null, // 房间创建状态: null, 'selecting_mode', 'selecting_pvp_option', 'selecting_game_type'
    waitingForGameType: false // 是否正在等待游戏类型选择
  };

  // DOM elements - 将在 init 函数中初始化
  let elements = {};

  // Available commands
  const commands = {
    help: {
      description: '显示可用命令',
      execute: showHelp
    },
    clear: {
      description: '清空终端输出',
      execute: clearTerminal
    },
    join: {
      description: '加入房间（用法：join 或 1）',
      execute: joinRoom
    },
    new: {
      description: '创建房间（用法：new 或 2）',
      execute: createRoom
    },
    rooms: {
      description: '显示可加入的房间',
      execute: showRooms
    },
    exit: {
      description: '退出当前房间或断开连接',
      execute: exitCommand
    },
    status: {
      description: '显示连接状态',
      execute: showStatus
    }
  };

  // Initialize terminal
  function init() {
    // 初始化 DOM 元素
    elements = {
      output: document.getElementById('terminal-output'),
      nicknameInput: document.getElementById('nickname-input'),
      nicknameContainer: document.getElementById('nickname-input-container'),
      commandInput: document.getElementById('command-input'),
      commandContainer: document.getElementById('command-input-container'),
      userPrompt: document.getElementById('user-prompt'),
      connectionStatus: document.getElementById('connection-status'),
      roomModal: document.getElementById('room-modal'),
      roomList: document.getElementById('room-list'),
      gameTypeModal: document.getElementById('game-type-modal')
    };

    // 确保所有元素都存在
    if (!elements.nicknameInput || !elements.commandInput) {
      console.error('Required DOM elements not found');
      return;
    }

    // Focus on nickname input
    elements.nicknameInput.focus();

    // Event listeners
    elements.nicknameInput.addEventListener('keypress', handleNicknameInput);
    elements.commandInput.addEventListener('keypress', handleCommandInput);
    elements.commandInput.addEventListener('keydown', handleCommandNavigation);

    // Add terminal control event listeners
    const closeBtn = document.querySelector('.control.close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (confirm('确定要退出游戏终端吗？')) {
          window.location.href = 'index.html';
        }
      });
    }

    const minimizeBtn = document.querySelector('.control.minimize');
    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => {
        const container = document.querySelector('.terminal-container');
        if (container) {
          container.style.transform = 'scale(0.9)';
          setTimeout(() => {
            container.style.transform = 'scale(1)';
          }, 300);
        }
      });
    }

    const maximizeBtn = document.querySelector('.control.maximize');
    if (maximizeBtn) {
      maximizeBtn.addEventListener('click', () => {
        const container = document.querySelector('.terminal-container');
        if (container) {
          container.classList.toggle('fullscreen');
        }
      });
    }

    // Add initial output
    addOutput('欢迎使用 Ratel Online 游戏终端 v2.0', 'success');
    addOutput('请输入昵称以继续...', 'info');
  }

  // Handle nickname input
  function handleNicknameInput(e) {
    if (e.key === 'Enter') {
      const nickname = elements.nicknameInput.value.trim();
      if (nickname) {
        terminalState.nickname = nickname;
        connectWebSocket(nickname);
      } else {
        addOutput('错误：昵称不能为空。', 'error');
      }
    }
  }

  // Handle command input
  function handleCommandInput(e) {
    if (e.key === 'Enter') {
      const command = elements.commandInput.value.trim();
      if (command) {
        // Add to history
        terminalState.commandHistory.push(command);
        terminalState.historyIndex = terminalState.commandHistory.length;

        // Show command in output
        addOutput(`${terminalState.nickname}@ratel:~$ ${command}`, 'prompt');

        // Process command
        processCommand(command);

        // Clear input
        elements.commandInput.value = '';
      }
    }
  }

  // Handle command navigation (up/down arrows for history)
  function handleCommandNavigation(e) {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (terminalState.historyIndex > 0) {
        terminalState.historyIndex--;
        elements.commandInput.value = terminalState.commandHistory[terminalState.historyIndex];
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (terminalState.historyIndex < terminalState.commandHistory.length - 1) {
        terminalState.historyIndex++;
        elements.commandInput.value = terminalState.commandHistory[terminalState.historyIndex];
      } else {
        terminalState.historyIndex = terminalState.commandHistory.length;
        elements.commandInput.value = '';
      }
    }
  }

  // Process command
  function processCommand(input) {
    const parts = input.toLowerCase().split(' ');
    const command = parts[0];

    // Check for numeric shortcuts
    if (command === '1') {
      joinRoom();
      return;
    } else if (command === '2') {
      createRoom();
      return;
    } else if (command === '5') {
      // Auto join Texas Hold'em
      selectGameType('poker');
      return;
    }

    // Check for game commands (poker actions)
    const gameCommands = ['call', 'raise', 'fold', 'check', 'allin'];
    if (gameCommands.includes(command)) {
      // Send game command directly to server
      terminalState.wsClient.sendMsg(input);
      // 停止倒计时
      stopCountdown();
      return;
    }

    // Check for terminal commands
    if (commands[command]) {
      commands[command].execute(parts.slice(1));
    } else {
      // For any other command, send it to the server
      terminalState.wsClient.sendMsg(input);
    }
  }

  // Connect WebSocket
  function connectWebSocket(nickname) {
    addOutput(`正在以 ${nickname} 的身份连接...`, 'info');
    updateConnectionStatus('connecting', '连接中...');

    // 重要：在创建 WebSocket 连接之前设置 window.name
    window.name = nickname;

    // Hide nickname input, show command input
    elements.nicknameContainer.style.display = 'none';
    elements.commandContainer.style.display = 'flex';
    elements.userPrompt.textContent = `${nickname}@ratel:~$ `;
    elements.commandInput.focus();

    // Get WebSocket URL from config
    let wsUrl;
    if (window.RatelConfig && window.RatelConfig.wsAddress && window.RatelConfig.wsAddress !== "__RATEL_WS_ADDRESS__") {
      wsUrl = window.RatelConfig.wsAddress;
    } else {
      // 使用默认的 WebSocket 地址
      wsUrl = 'wss://ratel-be.youdomain.com/ws';
    }

    console.log('WebSocket URL:', wsUrl);

    // 确保 WsClient 已加载
    if (typeof window.WsClient === 'undefined') {
      addOutput('错误：WebSocket 客户端组件未加载！', 'error');
      addOutput('请检查页面所需脚本是否已全部加载。', 'error');
      throw new Error('WsClient is not defined');
    }

    // 临时替换 Panel 为 ModernPanel
    const OriginalPanel = window.Panel;
    if (window.ModernPanel) {
      window.Panel = window.ModernPanel;
      console.log('Using ModernPanel instead of Panel for modern-terminal');
    }



    // Create WebSocket client
    // Create WebSocket client
    try {
      terminalState.wsClient = new window.WsClient(wsUrl);

      // 设置全局引用以保持向后兼容性
      window.wsClient = terminalState.wsClient;

      // 检查 panel 是否正确初始化
      if (!terminalState.wsClient.panel) {
        throw new Error('Panel initialization failed');
      }
    } catch (error) {
      addOutput('创建 WebSocket 客户端失败：' + error.message, 'error');
      addOutput('可能缺少依赖或页面元素。', 'error');

      // 允许用户重试
      elements.nicknameContainer.style.display = 'flex';
      elements.commandContainer.style.display = 'none';
      elements.nicknameInput.value = nickname;
      elements.nicknameInput.focus();
      return;
    }

    // Override panel methods to integrate with terminal
    terminalState.wsClient.panel.append = function (message) {
      // Parse and display message in terminal
      if (typeof message === 'string') {
        // Remove HTML tags for terminal display
        let cleanMessage = message.replace(/<[^>]*>/g, '');

        // 解码 HTML 实体
        cleanMessage = cleanMessage.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');

        // Skip empty messages
        if (cleanMessage.trim()) {
          // 检查消息中是否包含房间列表信息
          const roomDataPattern = /(\d+)\s+([\u4e00-\u9fa5\w-]+)\s+(\d+)\s+(等待中|游戏中|已满|Waiting|Running|Full)/g;
          const roomMatches = [...cleanMessage.matchAll(roomDataPattern)];

          if (roomMatches.length > 0) {
            // 如果找到房间数据，解析它们
            roomMatches.forEach(match => {
              const roomData = {
                roomId: parseInt(match[1]),
                roomType: match[2],
                roomClientCount: parseInt(match[3]),
                status: match[4]
              };

              // 避免重复添加相同的房间
              const exists = terminalState.availableRooms.some(r => r.roomId === roomData.roomId);
              if (!exists) {
                terminalState.availableRooms.push(roomData);
                console.log('Parsed room:', roomData);
              }
            });

            // 如果正在等待显示房间模态框，延迟一点显示
            if (terminalState.waitingForRoomModal && terminalState.availableRooms.length > 0) {
              setTimeout(() => {
                if (terminalState.waitingForRoomModal) {
                  terminalState.waitingForRoomModal = false;
                  clearTimeout(terminalState.roomModalTimeout);
                  showRoomModal();
                }
              }, 300);
            }
          } else if ((cleanMessage.includes('房间不存在') || cleanMessage.includes('Room invalid')) && terminalState.waitingForRoomModal) {
            // 如果收到 "Room invalid" 且没有房间数据，可能表示没有可用房间
            setTimeout(() => {
              if (terminalState.waitingForRoomModal && terminalState.availableRooms.length === 0) {
                terminalState.waitingForRoomModal = false;
                clearTimeout(terminalState.roomModalTimeout);
                showRoomModal();
              }
            }, 500);
          }

          // 检查是否在房间创建流程中
          if (terminalState.roomCreationState) {
            // 检查是否是主选项菜单 (Options: 1. PvP 2. PvE 3. Settings)
            if ((cleanMessage.includes('选项：') && cleanMessage.includes('1. 玩家对战')) || (cleanMessage.includes('Options:') && cleanMessage.includes('1. PvP'))) {
              terminalState.roomCreationState = 'selecting_mode';
              // 自动选择 PvP
              setTimeout(() => {
                terminalState.wsClient.sendMsg("1");
              }, 100);
              return;
            }
            // 检查是否是PvP选项菜单 (PVP: 1. Create Room 2. Room List...)
            else if ((cleanMessage.includes('玩家对战：') && cleanMessage.includes('1. 创建房间')) || (cleanMessage.includes('PVP:') && cleanMessage.includes('1. Create Room'))) {
              terminalState.roomCreationState = 'selecting_pvp_option';
              // 自动选择 Create Room
              setTimeout(() => {
                terminalState.wsClient.sendMsg("1");
              }, 100);
              return;
            }
            // 检查是否是游戏类型选择 (Please select game type)
            else if (cleanMessage.includes('请选择游戏类型') || cleanMessage.includes('Please select game type')) {
              terminalState.roomCreationState = 'selecting_game_type';
              terminalState.waitingForGameType = true;
              // 显示游戏类型选择模态框
              setTimeout(() => {
                showGameTypeModal();
              }, 100);
              return;
            }
            // 检查是否收到 "Game type invalid" 错误
            else if (cleanMessage.includes('游戏类型无效') || cleanMessage.includes('Game type invalid')) {
              // 如果在等待游戏类型选择，重新显示选择框
              if (terminalState.waitingForGameType) {
                addOutput('游戏类型无效，请重新选择。', 'error');
                setTimeout(() => {
                  showGameTypeModal();
                }, 500);
                return;
              }
            }
          }

          // 格式化游戏消息
          cleanMessage = formatGameMessage(cleanMessage);

          // 分行输出，每行可能有不同的样式
          const lines = cleanMessage.split('\n');
          lines.forEach(line => {
            if (!line.trim()) return;

            // 根据行内容决定样式
            let messageType = 'info';

            // 游戏状态
            if (line.includes('游戏开始！') || line.includes('Game starting!')) {
              messageType = 'success';
              // 游戏开始，重置回合信息
              terminalState.currentRound = 'Pre-flop';
            }
            // 手牌信息
            else if (line.includes('你的手牌：') || line.includes('Your hand:')) {
              messageType = 'warning';
              // 高亮显示手牌
              line = line.replace(/([♠♥♦♣]\w+)/g, '[$1]');
            }
            // 公共牌
            else if (line.includes('公共牌：') || line.includes('Board:') || line.includes('board:')) {
              messageType = 'info';
              line = line.replace(/([♠♥♦♣]\w+)/g, '[$1]');
            }
            // 获胜信息
            else if (line.includes('获胜者：') || line.includes('赢得本局') || line.includes('Winner:')) {
              messageType = 'success';
              // 游戏结束，停止倒计时
              stopCountdown();
            }
            // 行动提示
            else if (line.includes('请选择操作') || line.includes('What do you want to do?')) {
              messageType = 'prompt';
              // 开始倒计时
              startCountdown(60);
            }
            // 玩家行动
            else if (line.startsWith('>>')) {
              messageType = 'game-action';
              // 如果是其他玩家的行动，停止倒计时
              if (!line.includes('轮到') && !line.includes('turn to bet') && terminalState.isMyTurn) {
                stopCountdown();
              }
            }
            // 金额信息
            else if (line.includes('剩余积分：') || line.includes('累计下注：') || line.includes('amount')) {
              messageType = 'game-info';
            }
            // 回合信息
            else if (line.includes('回合') || line.includes('round')) {
              messageType = 'warning';
              // 识别当前回合阶段
              if (line.includes('翻牌前回合') || line.includes('Pre-flop round')) {
                terminalState.currentRound = 'Pre-flop';
              } else if (line.includes('翻牌回合') || line.includes('Flop round')) {
                terminalState.currentRound = 'Flop';
              } else if (line.includes('转牌回合') || line.includes('Turn round')) {
                terminalState.currentRound = 'Turn';
              } else if (line.includes('河牌回合') || line.includes('River round')) {
                terminalState.currentRound = 'River';
              }
            }
            // 盲注信息
            else if (line.includes('大盲') || line.includes('小盲') || line.includes('blind')) {
              messageType = 'game-info';
            }

            addSingleLine(line, messageType);
          });

          // 确保滚动到底部
          autoScrollToBottom();
        }
      }
    };

    terminalState.wsClient.panel.waitInput = function () {
      // Terminal is always ready for input
      return Promise.resolve();
    };

    terminalState.wsClient.panel.hide = function () {
      // No-op for terminal
    };

    terminalState.wsClient.panel.help = function () {
      // No-op for terminal, we have our own help
    };

    // 保存原始的 dispatch 方法
    const originalDispatch = terminalState.wsClient.dispatch;
    terminalState.wsClient.dispatch = function (serverTransferData) {
      // 拦截房间列表数据
      if (serverTransferData.code === window.ClientEventCodes.CODE_SHOW_ROOMS) {
        try {
          const rooms = JSON.parse(serverTransferData.data);
          terminalState.availableRooms = rooms;
          console.log('Received rooms:', rooms);
        } catch (e) {
          console.error('Failed to parse room data:', e);
        }
      }
      // 拦截房间创建成功
      else if (serverTransferData.code === window.ClientEventCodes.CODE_ROOM_CREATE_SUCCESS) {
        try {
          const roomData = JSON.parse(serverTransferData.data);
          addOutput(`房间创建成功！房间 ID：${roomData.id}`, 'success');
          terminalState.currentRoom = `房间 #${roomData.id}`;
        } catch (e) {
          console.error('Failed to parse room creation data:', e);
        }
      }
      // 调用原始的 dispatch 方法
      originalDispatch.call(this, serverTransferData);
    };

    // Initialize WebSocket connection
    terminalState.wsClient.init().then(() => {
      terminalState.connected = true;
      updateConnectionStatus('connected', '已连接');
      addOutput('已成功连接服务器！', 'success');
      addOutput('输入 help 查看可用命令，也可以直接输入：', 'info');
      addOutput('  1. join - 加入已有房间', 'info');
      addOutput('  2. new  - 创建新房间', 'info');

      // Set nickname - window.name 已经在连接前设置
      terminalState.wsClient.setUserName(nickname);

      // 如果有 imClient，也设置昵称
      if (window.imClient && window.imClient.setNickname) {
        window.imClient.setNickname(nickname);
      }

      // 恢复原始 Panel 类
      if (OriginalPanel) {
        window.Panel = OriginalPanel;
      }
    }).catch((error) => {
      terminalState.connected = false;
      updateConnectionStatus('disconnected', '未连接');
      addOutput('连接服务器失败！', 'error');
      addOutput('错误：' + error.message, 'error');

      // Allow retry
      elements.nicknameContainer.style.display = 'flex';
      elements.commandContainer.style.display = 'none';
      elements.nicknameInput.value = nickname;
      elements.nicknameInput.focus();

      // 恢复原始 Panel 类
      if (OriginalPanel) {
        window.Panel = OriginalPanel;
      }
    });
  }

  // Command functions
  function showHelp() {
    addOutput('可用命令：', 'info');
    for (const [cmd, info] of Object.entries(commands)) {
      addOutput(`  ${cmd.padEnd(10)} - ${info.description}`, 'info');
    }
    addOutput('\n快捷输入：', 'info');
    addOutput('  1          - 加入房间', 'info');
    addOutput('  2          - 创建房间', 'info');
    addOutput('  5          - 创建德州扑克房间', 'info');
  }

  function clearTerminal() {
    const welcomeMessage = elements.output.querySelector('.welcome-message');
    elements.output.innerHTML = '';
    if (welcomeMessage) {
      elements.output.appendChild(welcomeMessage);
    }
  }

  function joinRoom() {
    if (!terminalState.connected) {
      addOutput('错误：尚未连接服务器。', 'error');
      return;
    }

    // 发送 "1" 命令来获取房间列表
    addOutput('正在获取可加入的房间...', 'info');
    terminalState.availableRooms = []; // 清空之前的房间列表
    terminalState.waitingForRoomModal = true; // 标记正在等待房间数据
    terminalState.wsClient.sendMsg("1"); // 使用 sendMsg 发送原始消息

    // 设置超时，以防服务器没有返回数据
    terminalState.roomModalTimeout = setTimeout(() => {
      if (terminalState.waitingForRoomModal) {
        terminalState.waitingForRoomModal = false;
        showRoomModal();
      }
    }, 2000);
  }

  function createRoom() {
    if (!terminalState.connected) {
      addOutput('错误：尚未连接服务器。', 'error');
      return;
    }

    addOutput('正在创建新房间...', 'info');
    // Set room creation state
    terminalState.roomCreationState = 'starting';
    // Send "2" to server to start the room creation flow
    terminalState.wsClient.sendMsg("2");
    // The server will respond with options, and we'll handle them in the message handler
  }

  function showRooms() {
    if (!terminalState.connected) {
      addOutput('错误：尚未连接服务器。', 'error');
      return;
    }

    addOutput('正在获取房间列表...', 'info');
    terminalState.wsClient.send(window.ClientEventCodes.CODE_SHOW_ROOMS);
  }

  function exitCommand() {
    if (terminalState.currentRoom) {
      addOutput('正在退出当前房间...', 'info');
      // Send exit room command
      terminalState.wsClient.send(window.ClientEventCodes.CODE_CLIENT_EXIT);
      terminalState.currentRoom = null;
    } else if (terminalState.connected) {
      addOutput('正在断开服务器连接...', 'info');
      terminalState.wsClient.close();
      terminalState.connected = false;
      updateConnectionStatus('disconnected', '未连接');

      // Show nickname input again
      elements.nicknameContainer.style.display = 'flex';
      elements.commandContainer.style.display = 'none';
      elements.nicknameInput.value = '';
      elements.nicknameInput.focus();
    } else {
      addOutput('当前未连接任何服务器。', 'warning');
    }
  }

  function showStatus() {
    addOutput('=== 连接状态 ===', 'info');
    addOutput(`已连接：${terminalState.connected ? '是' : '否'}`, terminalState.connected ? 'success' : 'error');
    addOutput(`昵称：${terminalState.nickname || '未设置'}`, 'info');
    addOutput(`当前房间：${terminalState.currentRoom || '无'}`, 'info');
    addOutput('========================', 'info');
  }

  // Modal functions
  function showRoomModal() {
    // 使用真实的房间数据
    if (terminalState.availableRooms && terminalState.availableRooms.length > 0) {
      let roomsHtml = '';
      terminalState.availableRooms.forEach(room => {
        // roomType 已经是中文了，如 "德州扑克"
        const gameType = room.roomType;
        const status = room.status;
        const isRunning = status === 'Running' || status === '游戏中';
        const isJoinable = !isRunning && room.roomClientCount < 3;

        // 根据状态设置不同的样式和行为
        const roomClass = isRunning ? 'room-item room-running' :
          !isJoinable ? 'room-item room-full' :
            'room-item';
        const onclick = isJoinable ? `onclick="selectRoom('房间 #${room.roomId}', ${room.roomId})"` : '';
        const statusText = isRunning ? '游戏中（不可加入）' :
          room.roomClientCount >= 3 ? '人数已满' :
            '等待中';

        roomsHtml += `
          <div class="${roomClass}" ${onclick} ${!isJoinable ? 'style="cursor: not-allowed; opacity: 0.6;"' : ''}>
            <div class="room-name">房间 #${room.roomId}</div>
            <div class="room-info">ID：${room.roomId} | ${gameType} | 玩家：${room.roomClientCount}/3 | 状态：${statusText}</div>
          </div>
        `;
      });
      elements.roomList.innerHTML = roomsHtml;
    } else {
      elements.roomList.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #888;">
          <p>暂无可加入的房间</p>
          <p style="margin-top: 10px; font-size: 14px;">请创建新房间或刷新列表</p>
        </div>
      `;
    }
    elements.roomModal.style.display = 'flex';
  }

  function showGameTypeModal() {
    elements.gameTypeModal.style.display = 'flex';
  }

  // Global functions for modal interactions
  window.closeRoomModal = function () {
    elements.roomModal.style.display = 'none';
  };

  window.closeGameTypeModal = function () {
    elements.gameTypeModal.style.display = 'none';
    // Only show cancelled message if we're still waiting (user closed without selecting)
    if (terminalState.waitingForGameType && terminalState.roomCreationState === 'selecting_game_type') {
      terminalState.roomCreationState = null;
      terminalState.waitingForGameType = false;
      addOutput('已取消创建房间。', 'warning');
    }
  };

  window.selectRoom = function (roomName, roomId) {
    addOutput(`正在加入 ${roomName}（ID：${roomId}）...`, 'info');
    terminalState.currentRoom = roomName;

    // 发送房间 ID 来加入房间
    terminalState.wsClient.sendMsg(roomId.toString());

    closeRoomModal();
    // 不要立即显示成功消息，等待服务器确认
  };

  window.selectGameType = function (gameType) {
    const gameTypeMap = {
      'landlord': { name: '斗地主', number: '1' },
      'landlord-laizi': { name: '斗地主-癞子版', number: '2' },
      'landlord-super': { name: '斗地主-大招版', number: '3' },
      'run-fast': { name: '跑得快', number: '4' },
      'poker': { name: '德州扑克', number: '5' },
      'mahjong': { name: '麻将', number: '6' },
      'liar': { name: '骗子酒馆', number: '7' },
      'undercover': { name: '谁是卧底', number: '9' }
    };

    const selectedGame = gameTypeMap[gameType];
    if (!selectedGame) {
      addOutput('错误：选择的游戏类型无效。', 'error');
      return;
    }

    addOutput(`正在创建${selectedGame.name}房间...`, 'info');

    // Send the correct game type number
    terminalState.wsClient.sendMsg(selectedGame.number);

    // Reset room creation state BEFORE closing modal to avoid "cancelled" message
    terminalState.roomCreationState = null;
    terminalState.waitingForGameType = false;

    closeGameTypeModal();
    // Don't show success message yet, wait for server confirmation
  };

  // Format game messages for better readability
  function formatGameMessage(message) {
    // 将长消息按关键词分行
    let formatted = message;

    // 定义需要在其前面换行的关键词
    const breakBeforePatterns = [
      '你的手牌：',
      '公共牌：',
      '获胜者：',
      '小盲：',
      '大盲：',
      '你是小盲',
      '你是大盲',
      '翻牌前回合',
      '翻牌回合',
      '转牌回合',
      '河牌回合',
      '结算回合',
      '请选择操作',
      '请房主',
      '游戏开始！',
      'Your hand:',
      'Board:',
      'Winner:',
      'Small blind:',
      'Big blind:',
      'You are small blind',
      'You are big blind',
      'Pre-flop round',
      'Flop round',
      'Turn round',
      'River round',
      'Settlement round',
      'What do you want to do?',
      'Please room owner',
      'Game starting!',
      '>> joined room!',
      '>> fold',
      '>> call',
      '>> raise',
      '>> check',
      '>> allin',
      '>> Settlement'
    ];

    // 对每个模式进行替换
    breakBeforePatterns.forEach(pattern => {
      const regex = new RegExp(`(${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g');
      formatted = formatted.replace(regex, '\n$1');
    });

    // 特殊处理玩家金额信息，在每个玩家信息前换行
    formatted = formatted.replace(/(\w+ amount \d+)/g, '\n$1');
    formatted = formatted.replace(/([^\n]+ 剩余积分：\d+)/g, '\n$1');

    // 格式化扑克牌显示，添加空格
    formatted = formatted.replace(/([♠♥♦♣])(\w+)/g, '$1$2 ');

    // 清理多余的换行和空格
    formatted = formatted.split('\n').map(line => line.trim()).filter(line => line).join('\n');

    return formatted;
  }

  // Add a single line to output
  function addSingleLine(line, type = 'default') {
    if (!line.trim()) return;

    const lineElement = document.createElement('div');
    lineElement.className = `output-line ${type}`;

    // 如果包含扑克牌符号，使用innerHTML来支持样式
    if (line.includes('♠') || line.includes('♥') || line.includes('♦') || line.includes('♣')) {
      // 为不同花色的牌添加不同颜色 - 统一颜色规范
      let styledLine = line
        // 处理带方括号的扑克牌
        .replace(/\[([♠♣]\w+)\]/g, '<span style="color: #00FF00; font-weight: bold;">$1</span>')  // 黑桃和梅花 - 绿色
        .replace(/\[([♥♦]\w+)\]/g, '<span style="color: #FF0000; font-weight: bold;">$1</span>')  // 红心和方块 - 红色
        // 处理不带方括号的扑克牌
        .replace(/([♠♣])(\w+)/g, '<span style="color: #00FF00; font-weight: bold;">$1$2</span>')  // 黑桃和梅花 - 绿色
        .replace(/([♥♦])(\w+)/g, '<span style="color: #FF0000; font-weight: bold;">$1$2</span>'); // 红心和方块 - 红色
      lineElement.innerHTML = styledLine;
    } else {
      lineElement.textContent = line;
    }

    elements.output.appendChild(lineElement);

    // 立即滚动到底部
    autoScrollToBottom();
  }

  // Auto scroll to bottom
  function autoScrollToBottom() {
    if (elements.output) {
      // 使用 requestAnimationFrame 确保 DOM 更新后再滚动
      requestAnimationFrame(() => {
        elements.output.scrollTop = elements.output.scrollHeight;
      });
    }
  }

  // 开始倒计时
  function startCountdown(seconds = 60) {
    // 清除之前的倒计时
    stopCountdown();

    terminalState.isMyTurn = true;
    let timeLeft = seconds;

    // 获取当前阶段的显示名称
    let roundDisplay = '';
    switch (terminalState.currentRound) {
      case 'Pre-flop':
        roundDisplay = '翻牌前';
        break;
      case 'Flop':
        roundDisplay = '翻牌';
        break;
      case 'Turn':
        roundDisplay = '转牌';
        break;
      case 'River':
        roundDisplay = '河牌';
        break;
      default:
        roundDisplay = terminalState.currentRound || '未知回合';
    }

    // 创建倒计时显示元素
    const countdownLine = document.createElement('div');
    countdownLine.className = 'countdown-timer';
    countdownLine.innerHTML = `⏱️ 操作倒计时 [${roundDisplay}]：<span class="countdown-seconds">${timeLeft} 秒</span>`;
    elements.output.appendChild(countdownLine);
    terminalState.countdownElement = countdownLine;

    // 滚动到底部
    autoScrollToBottom();

    // 更新倒计时
    terminalState.countdownTimer = setInterval(() => {
      timeLeft--;
      const secondsSpan = countdownLine.querySelector('.countdown-seconds');

      if (timeLeft <= 0) {
        secondsSpan.textContent = '0 秒';
        secondsSpan.style.color = '#ff0041';
        addOutput('⏰ 操作超时，已自动弃牌。', 'error');
        // 自动fold
        terminalState.wsClient.sendMsg('fold');
        stopCountdown();
      } else if (timeLeft <= 10) {
        // 最后10秒警告
        secondsSpan.textContent = timeLeft + ' 秒';
        secondsSpan.style.color = '#ff0041';
        secondsSpan.style.animation = 'blink 0.5s infinite';
      } else if (timeLeft <= 20) {
        // 最后20秒提醒
        secondsSpan.textContent = timeLeft + ' 秒';
        secondsSpan.style.color = '#ffaa00';
      } else {
        secondsSpan.textContent = timeLeft + ' 秒';
      }
    }, 1000);
  }

  // 停止倒计时
  function stopCountdown() {
    if (terminalState.countdownTimer) {
      clearInterval(terminalState.countdownTimer);
      terminalState.countdownTimer = null;
    }

    if (terminalState.countdownElement) {
      terminalState.countdownElement.style.opacity = '0.5';
      terminalState.countdownElement = null;
    }

    terminalState.isMyTurn = false;
  }

  // Utility functions
  function addOutput(message, type = 'default') {
    // 如果消息包含换行符，分别输出每一行
    const lines = message.split('\n');
    lines.forEach(line => {
      addSingleLine(line.trim(), type);
    });
  }

  function updateConnectionStatus(status, text) {
    elements.connectionStatus.className = `status-${status}`;
    elements.connectionStatus.textContent = text;
  }

  // Initialize when DOM is ready
  console.log('Modern Terminal: Checking document ready state:', document.readyState);

  if (document.readyState === 'loading') {
    console.log('Modern Terminal: Waiting for DOMContentLoaded');
    document.addEventListener('DOMContentLoaded', init);
  } else {
    console.log('Modern Terminal: DOM already loaded, initializing now');
    // 使用 setTimeout 确保所有脚本都已加载
    setTimeout(init, 100);
  }
})();
