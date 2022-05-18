let $ = document.querySelector.bind(document);
const el = document.createElement.bind(document);

const range = (length) => new Array(length).fill(null);

const buildRow = (length) => {
  const rowTemplate = $('#row-template').content.cloneNode(true);
  const row = rowTemplate.querySelector('.row');
  // length - 1 since template already contains one cell
  range(length - 1).forEach(() => {
    const cell = rowTemplate.querySelector('.cell').cloneNode(true);
    row.append(cell);
  });
  return row;
};

const buildBoard = (rows) => {
  const board = $('.board');
  range(rows).forEach(() => {
    const row = buildRow(20);
    board.append(row);
  });
};

const invDir = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

const orthDir = {
  up: ['left', 'right'],
  down: ['left', 'right'],
  left: ['up', 'down'],
  right: ['up', 'down'],
};

class Node {
  constructor([row, col]) {
    this.row = row;
    this.col = col;
  }

  pos() {
    return [this.row, this.col];
  }

  up() {
    return [this.row - 1, this.col];
  }
  down() {
    return [this.row + 1, this.col];
  }
  right() {
    return [this.row, this.col + 1];
  }
  left() {
    return [this.row, this.col - 1];
  }

  dirFrom(node) {
    if (this.row < node.row) return 'up';
    if (this.row > node.row) return 'down';
    if (this.col < node.col) return 'left';
    if (this.col > node.col) return 'right';
  }

  equals(node) {
    return this.row === node.row && this.col === node.col;
  }

  toString() {
    return `[${this.row}, ${this.col}]`;
  }
}

class Cell extends Node {
  constructor(pos) {
    const [row, col] = pos;
    super(pos);
    this.row = row;
    this.col = col;
  }

  el() {
    return $(`.board :nth-child(${this.row + 2}) :nth-child(${this.col + 1})`);
  }

  setClassName(name) {
    this.el().className = name;
  }
}

class SnakeNode extends Cell {
  constructor(pos) {
    super(pos);
    this.prev = null;
    this.next = null;
  }
}

class Snake {
  constructor(pos) {
    this.head = new SnakeNode(pos);
    this.tail = this.head;
    this.dir = 'right'; // up | right | down | left
    this.nodes = new Set([this.head.toString()]);
  }

  get length() {
    return this.nodes.size;
  }

  includes(node) {
    return this.nodes.has(node.toString());
  }

  setDir(dir) {
    if (['up', 'right', 'down', 'left'].includes(dir)) this.dir = dir;
  }

  nextHeadNode() {
    const nextPos = this.head[this.dir]();
    return new SnakeNode(nextPos);
  }

  appendFront() {
    const nextNode = this.nextHeadNode();

    this.nodes.add(nextNode.toString());
    this.nodes.delete(this.tail.toString());

    this.head.prev = nextNode;
    nextNode.next = this.head;
    this.head = nextNode;
    this.tail = this.tail.prev;
    this.tail.next = null;
  }

  appendBack(valid) {
    let nextDir;
    if (this.length === 1) {
      nextDir = [invDir[this.dir]];
    } else {
      const oppDir = this.tail.dirFrom(this.tail.prev);
      nextDir = [...orthDir[oppDir], oppDir];
    }

    let nextPos = [-1, -1];
    while (!valid(nextPos) || this.includes(new Node(nextPos))) {
      if (nextDir.length === 0) return;

      nextPos = this.tail[nextDir.at(-1)]();
      nextDir.pop();
    }

    const nextNode = new SnakeNode(nextPos);
    this.nodes.add(nextNode.toString());
    this.tail.next = nextNode;
    nextNode.prev = this.tail;
    this.tail = nextNode;
  }

  move() {
    this.appendFront();
  }
}

class Board {
  constructor(length) {
    this.rows = length;
    this.cols = length;
    this.board = range(length).map((_, row) =>
      range(length).map((_, col) => new Cell([row, col])),
    );
    this.reset();
    buildBoard(length);
  }

  reset() {
    this.gameOver = false;
    this.snake = new Snake(this.random());
    this.generateFood();
  }

  random() {
    const row = Math.floor(Math.random() * this.rows);
    const col = Math.floor(Math.random() * this.rows);
    return [row, col];
  }

  randomCell() {
    return this.at(this.random());
  }

  valid([row, col]) {
    return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
  }

  at([row, col]) {
    return this.board[row][col];
  }

  generateFood() {
    let nextNode = this.randomCell();
    while (this.snake.includes(nextNode) || this.food?.equals(nextNode))
      nextNode = this.randomCell();

    if (this.food) this.food.state = 'empty';

    this.food = nextNode;
    this.food.state = 'food';
  }

  run() {
    const nextHeadNode = this.snake.nextHeadNode();
    if (
      !this.valid(nextHeadNode.pos()) ||
      this.snake.nodes.has(nextHeadNode.toString())
    ) {
      this.gameOver = true;
      return;
    }

    this.snake.move();

    if (this.snake.head.equals(this.food)) {
      this.generateFood();
      this.snake.appendBack(this.valid.bind(this));
    }
  }

  render() {
    // mark all as empty
    this.board.forEach((row) =>
      row.forEach((cell) => cell.setClassName(`cell empty`)),
    );

    // paint food
    this.food.setClassName('cell food');

    // paint snake
    let node = this.snake.head;
    while (node) {
      node.setClassName('cell snake');
      node = node.next;
    }
    this.snake.head.setClassName('cell snake head');
  }
}

const renderScore = (score) => {
  const el = $('.score');
  el.textContent = `Score: ${score}`;
};

const pauseBtn = $('.pause');
class Game {
  constructor() {
    this.paused = false;
    this.gameOver = false;
    this.board = new Board(20);
    document.addEventListener('keydown', ({ key }) => {
      const up = ['ArrowUp', 'k'];
      const right = ['ArrowRight', 'l'];
      const down = ['ArrowDown', 'j'];
      const left = ['ArrowLeft', 'h'];
      if (up.includes(key) && this.board.snake.dir !== 'down')
        this.board.snake.setDir('up');
      else if (right.includes(key) && this.board.snake.dir !== 'left')
        this.board.snake.setDir('right');
      else if (down.includes(key) && this.board.snake.dir !== 'up')
        this.board.snake.setDir('down');
      else if (left.includes(key) && this.board.snake.dir !== 'right')
        this.board.snake.setDir('left');
    });

    pauseBtn.addEventListener('click', this.togglePause.bind(this));
    window.addEventListener('keydown', (e) => {
      if (e.key === ' ') this.togglePause();
    });
  }

  togglePause() {
    pauseBtn.textContent = this.paused ? 'Pause' : 'Play';
    if (this.board.gameOver) {
      if (this.paused) {
        pauseBtn.textContent = 'Pause';
        this.reset();
      } else {
        pauseBtn.textContent = 'Start Over';
      }
    }

    this.paused = !this.paused;
  }

  wait(n) {
    return new Promise((res) => setTimeout(res, n));
  }

  render() {
    this.board.render();
    renderScore(this.board.snake.length);
    this.wait(16.6).then(this.render.bind(this));
  }

  run() {
    if (this.board.gameOver && !this.paused) {
      this.togglePause();
    }

    if (!this.paused) {
      this.board.run();
    }

    this.wait(100).then(this.run.bind(this));
  }

  reset() {
    this.board.reset();
  }

  start() {
    this.render();
    this.run();
  }
}

new Game().start();
