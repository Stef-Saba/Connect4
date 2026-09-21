import './style.css'

import { supabase } from './lib/supabaseClient'

const ROWS = 6

const COLUMNS = 7

let board = Array.from({ length: ROWS }, () =>
  Array(COLUMNS).fill(null)
)

let currentPlayer = 1

let newPiece = null

let gameOver = false

let stefaniaScore = 0

let princeScore = 0

let myPlayer = Number(localStorage.getItem('connect4-player'))

if (myPlayer !== 1 && myPlayer !== 2) {

  myPlayer = null

  localStorage.removeItem('connect4-player')

}

document.querySelector('#app').innerHTML = `

<main class="game">

  <h1>Connect Four</h1>

  <div class="player-selection" ${myPlayer ? 'hidden' : ''}>

    <h2>Who are you?</h2>

    <button class="player-choice" data-player="1">

      👩 Stefania

    </button>

    <button class="player-choice" data-player="2">

      👑 Prince

    </button>

  </div>

  <div class="game-area" ${myPlayer ? '' : 'hidden'}>

    <div class="score">

      <div>Stefania: <strong id="stefania-score">0</strong></div>

      <div>Prince: <strong id="prince-score">0</strong></div>

    </div>

    <p class="turn">Stefania's turn</p>

    <div class="board"></div>

    <div class="notification-settings">

      <button class="notification-button" type="button">

        🔔 Notifications

      </button>

    </div>

    <button class="change-player" type="button">

      Change player

    </button>

    <button class="new-game" hidden>Start New</button>

  </div>

</main>

`

const boardElement = document.querySelector('.board')

const turnElement = document.querySelector('.turn')

const stefaniaScoreElement = document.querySelector('#stefania-score')

const princeScoreElement = document.querySelector('#prince-score')

const newGameButton = document.querySelector('.new-game')

const playerSelection = document.querySelector('.player-selection')

const gameArea = document.querySelector('.game-area')

const playerChoiceButtons = document.querySelectorAll('.player-choice')

const notificationButton = document.querySelector('.notification-button')

const changePlayerButton = document.querySelector('.change-player')

function updateScore() {

  stefaniaScoreElement.textContent = stefaniaScore

  princeScoreElement.textContent = princeScore

}

function renderBoard() {

  boardElement.innerHTML = ''

  for (let row = 0; row < ROWS; row++) {

    for (let column = 0; column < COLUMNS; column++) {

      const cell = document.createElement('button')

      cell.type = 'button'

      cell.className = 'cell'

      cell.dataset.column = column

      if (board[row][column] === 1) {

        cell.classList.add('player-one')

        cell.style.backgroundImage = "url('/Stefania.png')"

      }

      if (board[row][column] === 2) {

        cell.classList.add('player-two')

        cell.style.backgroundImage = "url('/Prince.png')"

      }

      if (

        newPiece &&

        newPiece.row === row &&

        newPiece.column === column

      ) {

        cell.classList.add('drop-and-roll')

      }

      cell.addEventListener('click', () => makeMove(column))

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

  for (const [rowDirection, columnDirection] of directions) {

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

  let nextRow = row + rowDirection

  let nextColumn = column + columnDirection

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

function createConfetti() {

  for (let i = 0; i < 80; i++) {

    const piece = document.createElement('div')

    piece.className = 'confetti'

    piece.style.left = `${Math.random() * 100}vw`

    piece.style.animationDelay = `${Math.random() * 0.5}s`

    document.body.appendChild(piece)

    setTimeout(() => {

      piece.remove()

    }, 3000)

  }

}

async function saveGame() {

  const { error } = await supabase

    .from('games')

    .update({

      board,

      current_player: currentPlayer,

      stefania_score: stefaniaScore,

      prince_score: princeScore,

      game_over: gameOver,

      updated_at: new Date().toISOString()

    })

    .eq('id', 1)

  if (error) {

    console.error('Error saving game:', error)

  }

}

function urlBase64ToUint8Array(base64String) {

  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)

  const base64 = (base64String + padding)

    .replace(/-/g, '+')

    .replace(/_/g, '/')

  const rawData = window.atob(base64)

  return Uint8Array.from(

    [...rawData].map((character) => character.charCodeAt(0))

  )

}

async function enableNotifications() {

  if (!('serviceWorker' in navigator)) {

    alert('DEBUG: serviceWorker is not supported.')

    return

  }

  if (!('Notification' in window)) {

    alert('DEBUG: Notification API is not supported.')

    return

  }

  const permission = await Notification.requestPermission()

  if (permission !== 'granted') {

    console.log('Notification permission:', permission)

    return

  }

  try {

    const registration = await navigator.serviceWorker.ready

    if (!registration.pushManager) {

      alert('Push notifications are not available for this app.')

      return

    }

    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY

    if (!vapidPublicKey) {

      console.error('VITE_VAPID_PUBLIC_KEY is missing')

      alert('Notification setup is incomplete.')

      return

    }

    await registration.update()

    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {

      subscription = await registration.pushManager.subscribe({

        userVisibleOnly: true,

        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)

      })

    }

    const subscriptionJson = subscription.toJSON()

    const { error } = await supabase

      .from('push_subscriptions')

      .upsert(

        {

          player: myPlayer,

          endpoint: subscription.endpoint,

          p256dh: subscriptionJson.keys.p256dh,

          auth: subscriptionJson.keys.auth,

          updated_at: new Date().toISOString()

        },

        {

          onConflict: 'endpoint'

        }

      )

    if (error) {

      console.error('Error saving push subscription:', error)

      alert('Could not save notification settings.')

      return

    }

    notificationButton.textContent = '🔔 Notifications enabled'

    console.log('Push subscription saved')

  } catch (error) {

    console.error('Notification setup failed:', error)

    alert(`Notification setup failed: ${error.message}`)

  }

}

async function sendTurnNotification(player) {

  const { error } = await supabase.functions.invoke(

    'super-responder',

    {

      body: {

        type: 'turn',

        player

      }

    }

  )

  if (error) {

    console.error('Error sending turn notification:', error)

  }

}

async function sendWinNotification(winner) {

  const { error } = await supabase.functions.invoke(

    'super-responder',

    {

      body: {

        type: 'win',

        winner

      }

    }

  )

  if (error) {

    console.error('Error sending win notification:', error)

  }

}

async function makeMove(column) {

  if (gameOver) {

    return

  }

  if (currentPlayer !== myPlayer) {

    return

  }

  const playerWhoMoved = currentPlayer

  for (let row = ROWS - 1; row >= 0; row--) {

    if (board[row][column] === null) {

      board[row][column] = currentPlayer

      newPiece = {

        row,

        column

      }

      renderBoard()

      if (checkWinner(row, column)) {

        gameOver = true

        if (currentPlayer === 1) {

          stefaniaScore++

          turnElement.textContent = '🎉 Stefania wins!'

        } else {

          princeScore++

          turnElement.textContent = '🎉 Prince wins!'

        }

        updateScore()

        createConfetti()

        newGameButton.hidden = false

        newPiece = null

        await saveGame()

        await sendWinNotification(playerWhoMoved)

        return

      }

      currentPlayer = currentPlayer === 1 ? 2 : 1

      turnElement.textContent =

        currentPlayer === 1

          ? "Stefania's turn"

          : "Prince's turn"

      newPiece = null

      await saveGame()

      await sendTurnNotification(currentPlayer)

      return

    }

  }

}

async function startNewGame() {

  board = Array.from({ length: ROWS }, () =>

    Array(COLUMNS).fill(null)

  )

  currentPlayer = 1

  gameOver = false

  newPiece = null

  turnElement.textContent =

    currentPlayer === 1

      ? "Stefania's turn"

      : "Prince's turn"

  newGameButton.hidden = true

  renderBoard()

  await saveGame()

}

async function loadGame() {

  const { data, error } = await supabase

    .from('games')

    .select('*')

    .eq('id', 1)

    .single()

  if (error) {

    console.error('Error loading game:', error)

    return

  }

  board = data.board

  currentPlayer = data.current_player

  stefaniaScore = data.stefania_score

  princeScore = data.prince_score

  gameOver = data.game_over

  updateScore()

  renderBoard()

  if (gameOver) {

    turnElement.textContent =

      currentPlayer === 1

        ? '🎉 Stefania wins!'

        : '🎉 Prince wins!'

    newGameButton.hidden = false

  } else {

    turnElement.textContent =

      currentPlayer === 1

        ? "Stefania's turn"

        : "Prince's turn"

    newGameButton.hidden = true

  }

}

function subscribeToGame() {

  supabase

    .channel('connect4-game')

    .on(

      'postgres_changes',

      {

        event: 'UPDATE',

        schema: 'public',

        table: 'games',

        filter: 'id=eq.1'

      },

      (payload) => {

        const game = payload.new

        board = game.board

        currentPlayer = game.current_player

        stefaniaScore = game.stefania_score

        princeScore = game.prince_score

        gameOver = game.game_over

        newPiece = null

        updateScore()

        renderBoard()

        if (gameOver) {

          turnElement.textContent =

            currentPlayer === 1

              ? '🎉 Stefania wins!'

              : '🎉 Prince wins!'

          newGameButton.hidden = false

        } else {

          turnElement.textContent =

            currentPlayer === 1

              ? "Stefania's turn"

              : "Prince's turn"

          newGameButton.hidden = true

        }

      }

    )

    .subscribe((status) => {

      console.log('Realtime status:', status)

    })

}

function choosePlayer(player) {

  myPlayer = player

  localStorage.setItem('connect4-player', player)

  playerSelection.hidden = true

  gameArea.hidden = false

  loadGame()

}

function changePlayer() {

  localStorage.removeItem('connect4-player')

  myPlayer = null

  playerSelection.hidden = false

  gameArea.hidden = true

  notificationButton.textContent = '🔔 Notifications'

}

playerChoiceButtons.forEach((button) => {

  button.addEventListener('click', () => {

    choosePlayer(Number(button.dataset.player))

  })

})

notificationButton.addEventListener('click', enableNotifications)

changePlayerButton.addEventListener('click', changePlayer)

newGameButton.addEventListener('click', startNewGame)

if (myPlayer) {

  loadGame()

}

subscribeToGame()