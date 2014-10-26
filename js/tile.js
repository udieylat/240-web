function Tile(position) {
  this.x                = position.x;
  this.y                = position.y;
  this.type				= null; // 0 is block, 1 is main
}

Tile.prototype.serialize = function () {
  return {
    position: {
      x: this.x,
      y: this.y
    },
  };
};
