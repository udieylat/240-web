function Tile(position) {
  this.x                = position.x;
  this.y                = position.y;
}

Tile.prototype.serialize = function () {
  return {
    position: {
      x: this.x,
      y: this.y
    },
  };
};
