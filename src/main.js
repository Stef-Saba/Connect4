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

      <p class="turn">Your turn</p>

      <div class="board"></div>

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

function updateScore() {
  stefaniaScoreElement.textContent = stefaniaScore
  princeScoreElement.textContent = princeScore
}

function renderBoard() {
  boardElement.innerHTML = ''

  for (let row = 0; row < ROWS; row++) {
    for (let column = 0; column < COLUMNS; column++) {
      const cell = document.createElement('button')

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

async function makeMove(column) {
  if (gameOver) {
    return
  }

  if (currentPlayer !== myPlayer) {
    return
  }

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
      } else {
        currentPlayer = currentPlayer === 1 ? 2 : 1

        turnElement.textContent =
          currentPlayer === myPlayer
            ? 'Your turn'
            : "Friend's turn"
      }

      newPiece = null

      await saveGame()

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
    currentPlayer === myPlayer
      ? 'Your turn'
      : "Friend's turn"

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
      currentPlayer === myPlayer
        ? 'Your turn'
        : "Friend's turn"

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
            currentPlayer === myPlayer
              ? 'Your turn'
              : "Friend's turn"

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

playerChoiceButtons.forEach((button) => {
  button.addEventListener('click', () => {
    choosePlayer(Number(button.dataset.player))
  })
})

newGameButton.addEventListener('click', startNewGame)

if (myPlayer) {
  loadGame()
}

subscribeToGame()