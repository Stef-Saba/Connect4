import './style.css'

import { supabase } from './lib/supabaseClient'

const ROWS = 6
const COLUMNS = 7
const POLL_INTERVAL = 3000

let board = Array.from({ length: ROWS }, () =>
  Array(COLUMNS).fill(null)
)

let currentPlayer = 1
let newPiece = null
let gameOver = false
let stefaniaScore = 0
let princeScore = 0
let drawScore = 0
let rematchRequestedBy = null

let selectedGameId =
  Number(localStorage.getItem('connect4-game')) || null

let opponentName = null
let opponentImage = null

let myPlayer =
  Number(localStorage.getItem('connect4-player'))

let myPerson =
  localStorage.getItem('connect4-person')

let realtimeChannel = null
let realtimeReconnectTimer = null
let pollTimer = null
let lastKnownUpdatedAt = null
let loadingGame = false

if (myPlayer !== 1 && myPlayer !== 2) {
  myPlayer = null
  localStorage.removeItem('connect4-player')
}

if (
  myPerson !== 'Stefania' &&
  myPerson !== 'Prince' &&
  myPerson !== 'Olga'
) {
  myPerson = null
  localStorage.removeItem('connect4-person')
}

document.querySelector('#app').innerHTML = `

<main class="game">

  <h1>Connect Four</h1>

  <div class="player-selection" ${myPerson ? 'hidden' : ''}>

    <h2>Who are you?</h2>

    <button class="player-choice" data-person="Stefania">
      👩 Stefania
    </button>

    <button class="player-choice" data-person="Prince">
      👑 Prince
    </button>

    <button class="player-choice" data-person="Olga">
      👩 Olga
    </button>

  </div>

  <div class="game-selection" ${myPerson ? '' : 'hidden'}>

    <h2>Who do you want to play?</h2>

    <div class="game-choice-container"></div>

  </div>

  <div class="game-area" hidden>

    <div class="score">

      <div>
        <span id="my-score-name">Stefania</span>:
        <strong id="my-score">0</strong>
      </div>

      <div>
        <span id="opponent-score-name">Prince</span>:
        <strong id="opponent-score">0</strong>
      </div>

      <div>
        Draws:
        <strong id="draw-score">0</strong>
      </div>

    </div>

    <p class="turn">Stefania's turn</p>

    <div class="board"></div>

    <div class="notification-settings">

      <button class="notification-button" type="button">
        🔔 Notifications
      </button>

      <button
        class="notification-button"
        type="button"
        id="buzz-button"
      >
        👊 SEND A BUZZ
      </button>

    </div>

    <button class="change-player" type="button">
      Change player
    </button>

    <button class="change-game" type="button">
      Change opponent
    </button>

    <button class="new-game" hidden>
      Start New
    </button>

  </div>

</main>
`

const boardElement =
  document.querySelector('.board')

const turnElement =
  document.querySelector('.turn')

const myScoreNameElement =
  document.querySelector('#my-score-name')

const myScoreElement =
  document.querySelector('#my-score')

const opponentScoreNameElement =
  document.querySelector('#opponent-score-name')

const opponentScoreElement =
  document.querySelector('#opponent-score')

const drawScoreElement =
  document.querySelector('#draw-score')

const newGameButton =
  document.querySelector('.new-game')

const playerSelection =
  document.querySelector('.player-selection')

const gameSelection =
  document.querySelector('.game-selection')

const gameChoiceContainer =
  document.querySelector('.game-choice-container')

const gameArea =
  document.querySelector('.game-area')

const playerChoiceButtons =
  document.querySelectorAll('.player-choice')

const notificationButton =
  document.querySelector('.notification-button')

const buzzButton =
  document.querySelector('#buzz-button')

const changePlayerButton =
  document.querySelector('.change-player')

const changeGameButton =
  document.querySelector('.change-game')

function getPlayerName(player) {
  if (player === 1) {
    return 'Stefania'
  }

  return opponentName || 'Prince'
}

function getPlayerScore(player) {
  if (player === 1) {
    return stefaniaScore
  }

  return princeScore
}

function updateScore() {
  const myScore =
    getPlayerScore(myPlayer)

  const opponentPlayer =
    myPlayer === 1 ? 2 : 1

  const opponentScore =
    getPlayerScore(opponentPlayer)

  myScoreNameElement.textContent =
    getPlayerName(myPlayer)

  myScoreElement.textContent =
    myScore

  opponentScoreNameElement.textContent =
    getPlayerName(opponentPlayer)

  opponentScoreElement.textContent =
    opponentScore

  drawScoreElement.textContent =
    drawScore
}

function updateTurnText() {
  turnElement.textContent =
    `${getPlayerName(currentPlayer)}'s turn`
}

function renderBoard() {
  boardElement.innerHTML = ''

  for (let row = 0; row < ROWS; row++) {
    for (let column = 0; column < COLUMNS; column++) {
      const cell =
        document.createElement('button')

      cell.type = 'button'
      cell.className = 'cell'
      cell.dataset.column = column

      if (board[row][column] === 1) {
        cell.classList.add('player-one')
        cell.style.backgroundImage =
          "url('/Stefania.png')"
      }

      if (board[row][column] === 2) {
        cell.classList.add('player-two')
        cell.style.backgroundImage =
          `url('/${opponentImage || 'Prince.png'}')`
      }

      if (
        newPiece &&
        newPiece.row === row &&
        newPiece.column === column
      ) {
        cell.classList.add('drop-and-roll')
      }

      cell.addEventListener(
        'click',
        () => makeMove(column)
      )

      boardElement.appendChild(cell)
    }
  }
}

function checkWinner(row, column) {
  const player = board[row][column]

  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1]
  ]

  for (const [
    rowDirection,
    columnDirection
  ] of directions) {
    let count = 1

    count += countPieces(
      row,
      column,
      rowDirection,
      columnDirection,
      player
    )

    count += countPieces(
      row,
      column,
      -rowDirection,
      -columnDirection,
      player
    )

    if (count >= 4) {
      return true
    }
  }

  return false
}

function countPieces(
  row,
  column,
  rowDirection,
  columnDirection,
  player
) {
  let count = 0

  let nextRow =
    row + rowDirection

  let nextColumn =
    column + columnDirection

  while (
    nextRow >= 0 &&
    nextRow < ROWS &&
    nextColumn >= 0 &&
    nextColumn < COLUMNS &&
    board[nextRow][nextColumn] === player
  ) {
    count++

    nextRow += rowDirection
    nextColumn += columnDirection
  }

  return count
}

function isBoardFull() {
  return board.every(
    (row) =>
      row.every(
        (cell) => cell !== null
      )
  )
}

function boardHasWinner() {
  for (let row = 0; row < ROWS; row++) {
    for (
      let column = 0;
      column < COLUMNS;
      column++
    ) {
      if (
        board[row][column] !== null &&
        checkWinner(row, column)
      ) {
        return true
      }
    }
  }

  return false
}

function isDrawGame() {
  return (
    gameOver &&
    isBoardFull() &&
    !boardHasWinner()
  )
}

function createConfetti() {
  for (let i = 0; i < 80; i++) {
    const piece =
      document.createElement('div')

    piece.className = 'confetti'

    piece.style.left =
      `${Math.random() * 100}vw`

    piece.style.animationDelay =
      `${Math.random() * 0.5}s`

    document.body.appendChild(piece)

    setTimeout(() => {
      piece.remove()
    }, 3000)
  }
}

async function saveGame() {
  if (!selectedGameId) {
    return
  }

  const updatedAt =
    new Date().toISOString()

  const { error } = await supabase
    .from('games')
    .update({
      board,
      current_player: currentPlayer,
      stefania_score: stefaniaScore,
      prince_score: princeScore,
      draw_score: drawScore,
      game_over: gameOver,
      updated_at: updatedAt
    })
    .eq('id', selectedGameId)

  if (error) {
    console.error(
      'Error saving game:',
      error
    )

    return
  }

  lastKnownUpdatedAt = updatedAt
}

async function requestRematch() {
  if (!selectedGameId) {
    return
  }

  if (!gameOver) {
    return
  }

  if (rematchRequestedBy) {
    return
  }

  const updatedAt =
    new Date().toISOString()

  const { error } = await supabase
    .from('games')
    .update({
      rematch_requested_by: myPlayer,
      updated_at: updatedAt
    })
    .eq('id', selectedGameId)

  if (error) {
    console.error(
      'Error requesting rematch:',
      error
    )

    alert(
      'Could not request a new game.'
    )

    return
  }

  rematchRequestedBy = myPlayer
  lastKnownUpdatedAt = updatedAt

  turnElement.textContent =
    `Waiting for ${getPlayerName(
      myPlayer === 1 ? 2 : 1
    )}...`

  newGameButton.hidden = true
}

async function acceptRematch() {
  if (!selectedGameId) {
    return
  }

  if (!gameOver) {
    return
  }

  if (!rematchRequestedBy) {
    return
  }

  if (rematchRequestedBy === myPlayer) {
    return
  }

  // The person who clicked START NEW first starts the next game.
  const startingPlayer =
    rematchRequestedBy

  const emptyBoard =
    Array.from(
      { length: ROWS },
      () => Array(COLUMNS).fill(null)
    )

  const updatedAt =
    new Date().toISOString()

  const { error } = await supabase
    .from('games')
    .update({
      board: emptyBoard,
      current_player: startingPlayer,
      game_over: false,
      rematch_requested_by: null,
      last_reminder_at: null,
      reminder_player: null,
      updated_at: updatedAt
    })
    .eq('id', selectedGameId)

  if (error) {
    console.error(
      'Error accepting rematch:',
      error
    )

    alert(
      'Could not start the new game.'
    )

    return
  }

  board = emptyBoard
  currentPlayer = startingPlayer
  gameOver = false
  newPiece = null
  rematchRequestedBy = null
  lastKnownUpdatedAt = updatedAt

  updateTurnText()
  renderBoard()

  newGameButton.hidden = true
}

function urlBase64ToUint8Array(base64String) {
  const padding =
    '='.repeat(
      (4 - (base64String.length % 4)) % 4
    )

  const base64 =
    (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

  const rawData =
    window.atob(base64)

  return Uint8Array.from(
    [...rawData].map((character) =>
      character.charCodeAt(0)
    )
  )
}

async function enableNotifications() {
  if (!selectedGameId) {
    return
  }

  if (!('serviceWorker' in navigator)) {
    alert(
      'DEBUG: serviceWorker is not supported.'
    )

    return
  }

  if (!('Notification' in window)) {
    alert(
      'DEBUG: Notification API is not supported.'
    )

    return
  }

  const permission =
    await Notification.requestPermission()

  if (permission !== 'granted') {
    console.log(
      'Notification permission:',
      permission
    )

    return
  }

  try {
    const registration =
      await navigator.serviceWorker.ready

    if (!registration.pushManager) {
      alert(
        'Push notifications are not available for this app.'
      )

      return
    }

    const vapidPublicKey =
      import.meta.env.VITE_VAPID_PUBLIC_KEY

    if (!vapidPublicKey) {
      console.error(
        'VITE_VAPID_PUBLIC_KEY is missing'
      )

      alert(
        'Notification setup is incomplete.'
      )

      return
    }

    await registration.update()

    let subscription =
      await registration.pushManager
        .getSubscription()

    if (!subscription) {
      subscription =
        await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey:
            urlBase64ToUint8Array(
              vapidPublicKey
            )
        })
    }

    const subscriptionJson =
      subscription.toJSON()

    const {
      data: savedSubscription,
      error
    } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          player: myPlayer,
          game_id: selectedGameId,
          endpoint:
            subscription.endpoint,
          p256dh:
            subscriptionJson.keys.p256dh,
          auth:
            subscriptionJson.keys.auth,
          updated_at:
            new Date().toISOString()
        },
        {
          onConflict: 'endpoint'
        }
      )
      .select()
      .single()

    if (error) {
      console.error(
        'Error saving push subscription:',
        error
      )

      alert(
        'Could not save notification settings.'
      )

      return
    }

    const { error: linkError } =
      await supabase
        .from('game_push_subscriptions')
        .upsert({
          game_id: selectedGameId,
          subscription_id:
            savedSubscription.id
        })

    if (linkError) {
      console.error(
        'Error linking notification to game:',
        linkError
      )

      alert(
        'Could not link notifications to this game.'
      )

      return
    }

    notificationButton.textContent =
      '🔔 Notifications enabled'

    console.log(
      'Push subscription linked to game:',
      selectedGameId
    )
  } catch (error) {
    console.error(
      'Notification setup failed:',
      error
    )

    alert(
      `Notification setup failed: ${error.message}`
    )
  }
}

async function sendTurnNotification(player) {
  if (!selectedGameId) {
    return
  }

  const { error } =
    await supabase.functions.invoke(
      'super-responder',
      {
        body: {
          type: 'turn',
          player,
          game_id: selectedGameId
        }
      }
    )

  if (error) {
    console.error(
      'Error sending turn notification:',
      error
    )
  }
}

async function sendWinNotification(winner) {
  if (!selectedGameId) {
    return
  }

  const { error } =
    await supabase.functions.invoke(
      'super-responder',
      {
        body: {
          type: 'win',
          winner,
          game_id: selectedGameId
        }
      }
    )

  if (error) {
    console.error(
      'Error sending win notification:',
      error
    )
  }
}

async function sendBuzz() {
  if (
    myPlayer !== 1 &&
    myPlayer !== 2
  ) {
    return
  }

  if (!selectedGameId) {
    return
  }

  const targetPlayer =
    myPlayer === 1 ? 2 : 1

  buzzButton.disabled = true

  buzzButton.textContent =
    '👊 BUZZ SENT!'

  const { error } =
    await supabase.functions.invoke(
      'buzz',
      {
        body: {
          player: targetPlayer,
          game_id: selectedGameId
        }
      }
    )

  if (error) {
    console.error(
      'Error sending buzz:',
      error
    )

    buzzButton.disabled = false

    buzzButton.textContent =
      '👊 SEND A BUZZ'

    alert(
      'Could not send the buzz.'
    )

    return
  }

  setTimeout(() => {
    buzzButton.disabled = false
    buzzButton.textContent =
      '👊 SEND A BUZZ'
  }, 1500)
}

async function makeMove(column) {
  if (gameOver) {
    return
  }

  if (currentPlayer !== myPlayer) {
    return
  }

  const playerWhoMoved =
    currentPlayer

  for (
    let row = ROWS - 1;
    row >= 0;
    row--
  ) {
    if (board[row][column] === null) {
      board[row][column] =
        currentPlayer

      newPiece = {
        row,
        column
      }

      renderBoard()

      if (checkWinner(row, column)) {
        gameOver = true

        if (currentPlayer === 1) {
          stefaniaScore++
        } else {
          princeScore++
        }

        updateScore()

        turnElement.textContent =
          `🎉 ${getPlayerName(playerWhoMoved)} wins!`

        createConfetti()

        newGameButton.hidden = true

        newPiece = null

        await saveGame()

        await sendWinNotification(
          playerWhoMoved
        )

        updateGameOverUI()

        return
      }

      if (isBoardFull()) {
        gameOver = true
        drawScore++

        updateScore()

        turnElement.textContent =
          `🤝 IT'S A DRAW!`

        newGameButton.hidden = true

        newPiece = null

        await saveGame()

        updateGameOverUI()

        return
      }

      currentPlayer =
        currentPlayer === 1
          ? 2
          : 1

      updateTurnText()

      newPiece = null

      await saveGame()

      await sendTurnNotification(
        currentPlayer
      )

      return
    }
  }
}

function updateGameOverUI() {
  if (!gameOver) {
    updateTurnText()

    newGameButton.hidden = true
    newGameButton.textContent = 'Start New'

    return
  }

  const draw =
    isDrawGame()

  if (!rematchRequestedBy) {
    if (draw) {
      turnElement.textContent =
        `🤝 IT'S A DRAW!`

      newGameButton.textContent =
        'START NEW'

      newGameButton.hidden = false

      return
    }

    const winnerName =
      getPlayerName(currentPlayer)

    turnElement.textContent =
      `🎉 ${winnerName} wins!`

    if (currentPlayer === myPlayer) {
      newGameButton.textContent =
        'START NEW'
    } else {
      newGameButton.textContent =
        'PLAY AGAIN'
    }

    newGameButton.hidden = false

    return
  }

  if (rematchRequestedBy === myPlayer) {
    turnElement.textContent =
      `Waiting for ${getPlayerName(
        myPlayer === 1 ? 2 : 1
      )}...`

    newGameButton.hidden = true

    return
  }

  turnElement.textContent =
    `${getPlayerName(rematchRequestedBy)} wants to play again!`

  if (draw) {
    newGameButton.textContent =
      'START NEW'
  } else {
    newGameButton.textContent =
      'PLAY AGAIN'
  }

  newGameButton.hidden = false
}

function applyGameData(data) {
  if (!data) {
    return
  }

  if (
    selectedGameId &&
    data.id !== selectedGameId
  ) {
    return
  }

  const wasGameOver =
    gameOver

  board = data.board

  currentPlayer =
    data.current_player

  stefaniaScore =
    data.stefania_score

  princeScore =
    data.prince_score

  if (
    Object.prototype.hasOwnProperty.call(
      data,
      'draw_score'
    )
  ) {
    drawScore =
      data.draw_score ?? 0
  }

  gameOver =
    data.game_over

  if (
    Object.prototype.hasOwnProperty.call(
      data,
      'rematch_requested_by'
    )
  ) {
    rematchRequestedBy =
      data.rematch_requested_by
  }

  opponentName =
    data.opponent_name ||
    (
      selectedGameId === 2
        ? 'Olga'
        : 'Prince'
    )

  opponentImage =
    data.opponent_image ||
    (
      selectedGameId === 2
        ? 'Olga.png'
        : 'Prince.png'
    )

  lastKnownUpdatedAt =
    data.updated_at

  newPiece = null

  updateScore()
  renderBoard()

  if (
    gameOver &&
    !wasGameOver &&
    !isDrawGame()
  ) {
    createConfetti()
  }

  updateGameOverUI()
}

async function loadGame() {
  if (!selectedGameId) {
    return
  }

  if (loadingGame) {
    return
  }

  loadingGame = true

  try {
    const { data, error } =
      await supabase
        .from('games')
        .select('*')
        .eq('id', selectedGameId)
        .single()

    if (error) {
      console.error(
        'Error loading game:',
        error
      )

      return
    }

    applyGameData(data)
  } finally {
    loadingGame = false
  }
}

async function checkForGameUpdate() {
  if (!selectedGameId) {
    return
  }

  if (
    document.visibilityState !== 'visible'
  ) {
    return
  }

  const { data, error } =
    await supabase
      .from('games')
      .select(
        'id, board, current_player, stefania_score, prince_score, draw_score, game_over, updated_at, opponent_name, opponent_image, rematch_requested_by'
      )
      .eq('id', selectedGameId)
      .single()

  if (error) {
    console.error(
      'Polling game update failed:',
      error
    )

    return
  }

  if (
    data.updated_at !== lastKnownUpdatedAt ||
    data.rematch_requested_by !== rematchRequestedBy ||
    data.draw_score !== drawScore
  ) {
    applyGameData(data)
  }
}

function startPolling() {
  stopPolling()

  pollTimer =
    setInterval(
      checkForGameUpdate,
      POLL_INTERVAL
    )
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function scheduleRealtimeReconnect() {
  if (realtimeReconnectTimer) {
    return
  }

  realtimeReconnectTimer =
    setTimeout(() => {
      realtimeReconnectTimer = null

      if (selectedGameId) {
        subscribeToGame()
      }
    }, 1500)
}

function subscribeToGame() {
  if (realtimeReconnectTimer) {
    clearTimeout(
      realtimeReconnectTimer
    )

    realtimeReconnectTimer = null
  }

  if (realtimeChannel) {
    supabase.removeChannel(
      realtimeChannel
    )

    realtimeChannel = null
  }

  const channelName =
    `connect4-game-${Date.now()}`

  realtimeChannel =
    supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games'
        },
        (payload) => {
          applyGameData(
            payload.new
          )
        }
      )
      .subscribe((status) => {
        console.log(
          'Realtime status:',
          status
        )

        if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          scheduleRealtimeReconnect()
        }
      })
}

function renderGameChoices() {
  gameChoiceContainer.innerHTML = ''

  if (myPerson === 'Stefania') {
    addGameChoice(
      1,
      '👑 Prince'
    )

    addGameChoice(
      2,
      '👩 Olga'
    )

    return
  }

  if (myPerson === 'Prince') {
    addGameChoice(
      1,
      '👩 Stefania'
    )

    return
  }

  if (myPerson === 'Olga') {
    addGameChoice(
      2,
      '👩 Stefania'
    )
  }
}

function addGameChoice(
  gameId,
  label
) {
  const button =
    document.createElement('button')

  button.className =
    'game-choice'

  button.dataset.game =
    gameId

  button.textContent =
    label

  button.addEventListener(
    'click',
    () => {
      chooseGame(gameId)
    }
  )

  gameChoiceContainer.appendChild(
    button
  )
}

function choosePlayer(person) {
  myPerson = person

  localStorage.setItem(
    'connect4-person',
    person
  )

  if (person === 'Stefania') {
    myPlayer = 1
  } else {
    myPlayer = 2
  }

  localStorage.setItem(
    'connect4-player',
    myPlayer
  )

  playerSelection.hidden = true
  gameSelection.hidden = false
  gameArea.hidden = true

  renderGameChoices()
}

function chooseGame(gameId) {
  selectedGameId = gameId

  localStorage.setItem(
    'connect4-game',
    gameId
  )

  gameSelection.hidden = true
  gameArea.hidden = false

  notificationButton.textContent =
    '🔔 Notifications'

  subscribeToGame()
  loadGame()
  startPolling()
}

function changePlayer() {
  localStorage.removeItem(
    'connect4-player'
  )

  localStorage.removeItem(
    'connect4-person'
  )

  localStorage.removeItem(
    'connect4-game'
  )

  myPlayer = null
  myPerson = null
  selectedGameId = null

  stopPolling()

  playerSelection.hidden = false
  gameSelection.hidden = true
  gameArea.hidden = true

  notificationButton.textContent =
    '🔔 Notifications'

  if (realtimeChannel) {
    supabase.removeChannel(
      realtimeChannel
    )

    realtimeChannel = null
  }
}

function changeGame() {
  localStorage.removeItem(
    'connect4-game'
  )

  selectedGameId = null

  stopPolling()

  gameSelection.hidden = false
  gameArea.hidden = true

  notificationButton.textContent =
    '🔔 Notifications'

  if (realtimeChannel) {
    supabase.removeChannel(
      realtimeChannel
    )

    realtimeChannel = null
  }

  renderGameChoices()
}

playerChoiceButtons.forEach(
  (button) => {
    button.addEventListener(
      'click',
      () => {
        choosePlayer(
          button.dataset.person
        )
      }
    )
  }
)

notificationButton.addEventListener(
  'click',
  enableNotifications
)

buzzButton.addEventListener(
  'click',
  sendBuzz
)

changePlayerButton.addEventListener(
  'click',
  changePlayer
)

changeGameButton.addEventListener(
  'click',
  changeGame
)

newGameButton.addEventListener(
  'click',
  () => {
    if (
      gameOver &&
      rematchRequestedBy &&
      rematchRequestedBy !== myPlayer
    ) {
      acceptRematch()
    } else {
      requestRematch()
    }
  }
)

document.addEventListener(
  'visibilitychange',
  () => {
    if (
      document.visibilityState ===
      'visible'
    ) {
      if (selectedGameId) {
        subscribeToGame()
        loadGame()
        startPolling()
      }
    } else {
      stopPolling()
    }
  }
)

window.addEventListener(
  'online',
  () => {
    if (selectedGameId) {
      subscribeToGame()
      loadGame()
      startPolling()
    }
  }
)

if (myPerson && selectedGameId) {
  playerSelection.hidden = true
  gameSelection.hidden = true
  gameArea.hidden = false

  loadGame()
  startPolling()
} else if (myPerson) {
  playerSelection.hidden = true
  gameSelection.hidden = false
  gameArea.hidden = true

  renderGameChoices()
}

subscribeToGame()

if (selectedGameId) {
  startPolling()
}