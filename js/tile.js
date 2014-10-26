function Tile(position) {
  this.x                = position.x;
  this.y                = position.y;
  this.type				= null; // 0 is block; 1 is main; 2 is also blocked, but where the main was just at
}

Tile.prototype.serialize = function () {
  return {
    position: {
      x: this.x,
      y: this.y
    },
  };
};
