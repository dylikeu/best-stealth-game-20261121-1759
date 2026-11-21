// NIGHTSHIFT — input.js: keyboard + mouse input with edge detection.
// Keys are tracked by their `code` so WASD and arrows both work; `pressed`
// fires once per key-down so menus and interactions never double-trigger.

const MOVE_KEYS = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
};

export class Input {
  constructor() {
    this.down = new Set(); // codes currently held
    this.pressed = new Set(); // codes pressed since last consume
    this.mouseX = 0;
    this.mouseY = 0;
    this.mousePressed = false;
    this.mouseClicked = false;
    this._onKeyDown = (e) => {
      if (e.code === 'ArrowUp' || e.code === 'ArrowDown' || e.code === 'Space') {
        e.preventDefault();
      }
      if (!e.repeat) this.pressed.add(e.code);
      this.down.add(e.code);
    };
    this._onKeyUp = (e) => this.down.delete(e.code);
    this._onMouseMove = (e) => {
      const rect = e.target.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    };
    this._onMouseDown = (e) => {
      this.mousePressed = true;
      this.mouseClicked = true;
      this._onMouseMove(e);
    };
    this._onMouseUp = () => {
      this.mousePressed = false;
    };
    this._onBlur = () => {
      this.down.clear();
    };
  }

  attach(canvas) {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
  }

  // Direction vector from held movement keys, normalised.
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.down.has('KeyA') || this.down.has('ArrowLeft')) x -= 1;
    if (this.down.has('KeyD') || this.down.has('ArrowRight')) x += 1;
    if (this.down.has('KeyW') || this.down.has('ArrowUp')) y -= 1;
    if (this.down.has('KeyS') || this.down.has('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.hypot(x, y);
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  get sneaking() {
    return this.down.has('ShiftLeft') || this.down.has('ShiftRight');
  }

  get sprinting() {
    return false; // sprint is contextual: the rooftop dash is a normal run
  }

  // True once per physical press; callers consume it each frame.
  wasPressed(code) {
    return this.pressed.has(code);
  }

  consumePressed(code) {
    if (this.pressed.has(code)) {
      this.pressed.delete(code);
      return true;
    }
    return false;
  }

  consumeClick() {
    if (this.mouseClicked) {
      this.mouseClicked = false;
      return true;
    }
    return false;
  }

  endFrame() {
    this.pressed.clear();
    this.mouseClicked = false;
  }
}
