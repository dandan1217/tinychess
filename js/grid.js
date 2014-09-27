function Grid() {
  this.cells = null;
}

Grid.prototype.getAcitiveColor = function(){
  return this.activeColor;
};

Grid.prototype.initialize = function(fen){
  if (!this.vaildFen(fen)) return false;

  this.cells = this.fromFen(fen);

  var atts = fen.replace(/(s*$)/g, "").split(" ");
  this.activeColor = atts[1];
  this.castling = atts[2];
  this.enpass = atts[3];
  this.nhalfmove = parseInt(atts[4]) || 0;
  this.nfullmove = parseInt(atts[5]) || 0;

  return true;
};

Grid.prototype.vaildFen = function (fen) {
  if (typeof fen !== 'string') return false;

  var atts = fen.replace(/(s*$)/g, "").split(" ");
  if (atts.length != 6) return false;
  // cut off any move, castling, etc info from the end
  // we're only interested in position information
  fen = fen.replace(/ .+$/, '');

  // FEN should be 8 sections separated by slashes
  var chunks = fen.split('/');
  if (chunks.length !== 8) return false;

  // check the piece sections
  for (var i = 0; i < 8; i++) {
    if (chunks[i] === '' ||
        chunks[i].length > 8 ||
        chunks[i].search(/[^kqrbnpKQRNBP1-8]/) !== -1) {
      return false;
    }
  }

  return true;
};

Grid.prototype.fromFen = function(fen){
  s="abcdefgh"
  var cells = []

  if (!this.vaildFen(fen)) return false;

  var rows = fen.replace(/ .+$/,'').split('/');

  for (var i = 0; i < rows.length; i++){
    cells[i] = [];
    var row = rows[i];
    var colIndex = 0;
        // loop through each character in the FEN section
    for (var j = 0; j < row.length; j++) {
      // number / empty squares
      if (row[j].search(/[1-8]/) !== -1) {
        var emptySquares = parseInt(row[j], 10);
        for (var k = 0;k < emptySquares;k++){
          cells[i].push(null);
          colIndex++;
        }
      }
      // piece
      else {
        cells[i].push( new Tile({x:s[colIndex],y:8-i},row[j]));
        colIndex++;
      }
    }
  }

  return cells;
};

Grid.prototype.getStartPosition = function(color,value,x2,y2,x1){
  for (var i = 0;i < 8;i++){
    for (var j = 0;j<8;j++){
      if (this.cells[i][j] && this.cells[i][j].value == value){
        var xy1 = this.positionTranslateIJ2XY({i:i,j:j});
        if(x1){
          if (xy1.x === x1)
            return xy1;
        }else{
          move = ""+xy1.x+xy1.y+x2+y2;
          if ("P" == value)
            move += "Q";
          if (this.checkMove(color,move))
            return xy1;
        }
      }
    }
  }
  return null;
};

Grid.prototype.normalize = function(pmove){
  pmove = pmove.replace(/(^\s*)|(\s*$)/g, "");
  re = /^([PRNBKQ]?)([a-h|]?)([1-8]?)([x|-]?)([a-h])([1-8])(=Q|=N|\=R|\=B?)/;
  if(re.test(pmove)){
    var m = RegExp.$1 || "P";
    var x1 = RegExp.$2;
    var y1 = RegExp.$3;
    var x2 = RegExp.$5;
    var y2 = RegExp.$6;
    var c = RegExp.$7 && RegExp.$7[1];

    return x1+y1+x2+y2+c;
  }else
    return "";
};

Grid.prototype.getCellValue = function(ij){
  var i = ij.i;
  var j = ij.j;
  if(! this.cells[i][j])
    return ""
  return this.cells[i][j].value;
};

Grid.prototype._isOccupiedByColor = function(color,ij){
  var value = this.getCellValue(ij);
  if (color == "w")
    return /[PRNBKQ]/.test(value);
  else if (color == "b") 
    return /[prnbkq]/.test(value);
};

Grid.prototype._isOccupied = function(ij){
  return !!this.getCellValue(ij);
};


Grid.prototype._checkAttackP = function(color,ij1,ij2){
  if (ij1 === ij2) return false;

  var i1 = ij1.i;
  var j1 = ij1.j;
  var i2 = ij2.i;
  var j2 = ij2.j;

  if (Math.abs(j2-j1) == 1){

    if (color == "w" && i2-i1 == -1)
      return true;

    if (color == "b" && i2-i1==1) 
      return true;
  }
  return false;
};

Grid.prototype._checkAttackR = function(color,ij1,ij2){
  return this._checkMoveR(color,ij1,ij2);
};

Grid.prototype._checkAttackN = function(color,ij1,ij2){
  return this._checkMoveN(color,ij1,ij2);
};

Grid.prototype._checkAttackB = function(color,ij1,ij2){
  return this._checkMoveB(color,ij1,ij2);
};

Grid.prototype._checkAttackQ = function(color,ij1,ij2){
  return this._checkMoveQ(color,ij1,ij2);
};

Grid.prototype._checkAttackK = function(color,ij1,ij2){
  if (ij1 === ij2) return false;

  var dis = this._distance2(ij1,ij2);
  if (!this._isOccupiedByColor(color,ij2) && (dis == 1 || dis == 2))
    return true;
  return false;
};


Grid.prototype._checkMoveQ = function(color,ij1,ij2){
  return this._checkMoveR(color,ij1,ij2) || this._checkMoveB(color,ij1,ij2);
};

Grid.prototype._checkMoveP = function(color,ij1,ij2){

  if (ij1 === ij2) return false;

  var i1 = ij1.i;
  var j1 = ij1.j;
  var i2 = ij2.i;
  var j2 = ij2.j;
  if (j1 == j2){
    if (color == "w" && (i2-i1 == -1 || (i1 == 6) && i2-i1 == -2) || 
        color == "b" && (i2-i1 == 1  || (i1 == 1) && i2-i1 == 2)  ){

      // if (this._isOccupiedByColor(color,ij2))
      //   return false;

      if (this._isOccupied(ij2))
        return false;

      return true;
    }
  }else if (Math.abs(j2-j1) == 1){

    if (color == "w" && i2-i1 == -1 && (this._isOccupiedByColor("b",ij2) ||this.positionTranslateIJ2XY(ij2).x == this.enpass[0]) )
      return true;

    if (color == "b" && i2-i1==1 && (this._isOccupiedByColor("w",ij2) || this.positionTranslateIJ2XY(ij2).x ==this.enpass[0]) ) 
      return true;
  }
  return false;
};

Grid.prototype._checkMoveR = function(color,ij1,ij2){
  if (ij1 === ij2) return false;

  var i1 = ij1.i;
  var j1 = ij1.j;
  var i2 = ij2.i;
  var j2 = ij2.j;

  if (i1 == i2 || j1 == j2){

    if (i1 == i2){
      var step = (j2-j1) < 0 ? -1 : 1;
      var j = j1+step;
      while (j != j2){
        if (this.getCellValue({i:i1,j:j}))
          return false
        j += step;
      }
    }else{
      var step = (i2-i1) < 0 ? -1 : 1;
      var i = i1+step;
      while (i != i2){
        if (this.getCellValue({i:i,j:j1}))
          return false;
        i += step;
      }
    }

    if (this._isOccupiedByColor(color,ij2))
     return false;

    return true;
  };

  return false;
};

Grid.prototype._checkMoveN = function(color,ij1,ij2){
  if (ij1 === ij2) return false;
  var dis = this._distance2(ij1,ij2);
  if (!this._isOccupiedByColor(color,ij2) && (dis == 5))
    return true;
  return false;
};

Grid.prototype._checkMoveB = function(color,ij1,ij2){
  if (ij1 === ij2) return false;
  var i1 = ij1.i;
  var j1 = ij1.j;
  var i2 = ij2.i;
  var j2 = ij2.j;

  if (Math.abs(i1-i2) == Math.abs(j1-j2)){

    var stepi = (i2 - i1) < 0 ? -1 : 1;
    var stepj = (j2 - j1) < 0 ? -1 : 1;
    var i = i1+stepi;
    var j = j1+stepj;
    while (i != i2){
      if (this.getCellValue({i:i,j:j}))
        return false;
      i += stepi;
      j += stepj;
    }
    if (this._isOccupiedByColor(color,ij2)) return false;

    return true;
  }
  return false;
};

Grid.prototype._checkMoveK = function(color,ij1,ij2){
  if (ij1 === ij2) return false;

  var dis = this._distance2(ij1,ij2);
  if (!this._isOccupiedByColor(color,ij2) && (dis == 1 || dis == 2))
    return true;
  return false;
};

Grid.prototype._distance2 = function(ij1,ij2){
  var i1 = ij1.i;
  var j1 = ij1.j;
  var i2 = ij2.i;
  var j2 = ij2.j;
  return Math.pow(i1-i2,2)+Math.pow(j1-j2,2);
};

Grid.prototype.checkMove = function(move){
  // move = "e2e4P"

  var color = this.activeColor;
  move = move.replace(/(^\s*)|(\s*$)/g, "");
  re = /^([a-h])([1-8])([a-h])([1-8])([RNBQ]?)/;
  if(re.test(move)){
    var x1 = RegExp.$1;
    var y1 = parseInt(RegExp.$2);
    var x2 = RegExp.$3;
    var y2 = parseInt(RegExp.$4);
    var c = RegExp.$5;

    var ij1 = this.positionTranslateXY2IJ({x:x1,y:y1});
    var ij2 = this.positionTranslateXY2IJ({x:x2,y:y2});

    if(!this.cells[ij1.i][ij1.j]) return false;
    var value = this.cells[ij1.i][ij1.j].value.toLowerCase();

    switch(value){
      case "p":
      this.checkfn = this._checkMoveP;
      break;
      case "r":
      this.checkfn = this._checkMoveR;
      break;
      case "n":
      this.checkfn = this._checkMoveN;
      break;
      case "b":
      this.checkfn = this._checkMoveB;
      break;
      case "q":
      this.checkfn = this._checkMoveQ;
      break;
      case "k":
      this.checkfn = this._checkMoveK;
      break;
    }


    if(! this.checkfn(this.activeColor,ij1,ij2))
      return false;

    if(this.kingUnderAttackAfterMove(move))
      //after move ,the king can't be under attack
      return false;

    return true;
  }
  return false;
};


Grid.prototype.cellIsUnderAttack = function(xy){
  console.log("check under attack: "+ xy.x+xy.y);
  var ij2 = this.positionTranslateXY2IJ(xy);
  var color = this.activeColor;

  var oppoent = "";
  var oppcolor = "";
  if (color == "w"){
    oppoent = /[prnbkq]/;
    oppcolor = "b";
  }else{
    oppoent = /[PRNBKQ]/;
    oppcolor = "w";
  }

  for (var i = 0; i < this.size; i++) {
    for (var i = 0; y < this.size; i++) {
      var ij1 = {i:i,j:j};

      var value = "";
      if (this.cells[i][j])
        value = this.cells[i][j].value;

      if (oppoent.test(value)){
        value = value.toLowerCase();

        switch(value){
          case "p":
          this.attackfn = this._checkAttckP;
          break;
          case "r":
          this.attackfn = this._checkAttackR;
          break;
          case "n":
          this.attackfn = this._checkAttackN;
          break;
          case "b":
          this.attackfn = this._checkAttackB;
          break;
          case "q":
          this.attackfn = this._checkAttackQ;
          break;
          case "k":
          this.attackfn = this._checkAttackK;
          break;
        }

        if(this.attackfn(oppcolor,ij1,ij2)){
          alert(xy.x+xy.y + " is under attck");
          return true;
        }
      }
    }
  }

  return false;
};

Grid.prototype.kingUnderAttackAfterMove = function(move){
  //TODO ...
  return false;
};

Grid.prototype.move = function(move){
  var xy1 = {x:move[0],y:parseInt(move[1])};
  var ij1 = this.positionTranslateXY2IJ(xy1);
  var i1 = ij1.i;var j1 = ij1.j;

  var xy2 = {x:move[2],y:parseInt(move[3])};
  var ij2 = this.positionTranslateXY2IJ(xy2);
  var i2 = ij2.i;j2 = ij2.j;


  //check half move
  if ( /[Pp]/.test(this.getCellValue(ij1)) || this._isOccupied(ij2)) 
    this.nhalfmove = 0;
  else
    this.nhalfmove +=1;

  //set enpass default
  this.enpass = "-";

  //check enpass
  if (this.getCellValue(ij1) == "P" && Math.abs(i2-i1) == 2 && 
      (this.getCellValue({i:ij2.i,j:ij2.j-1}) == "p" || this.getCellValue({i:ij2.i,j:ij2.j+1}))){
    this.enpass = xy2.x+(xy2.y-1);
    console.log("enpass:   " + this.enpass);
  }
  if (this.getCellValue(ij1) == "p" && Math.abs(i2-i1) == 2 ){
    this.enpass = xy2.x+(xy2.y+1);
    console.log("enpass    " + this.enpass);
  }

  //TODO check castling
  //if (this.getCellValue(ij1) == "R" && xy1=={x:})

  //enpass pown
  if ( /[Pp]/.test(this.getCellValue(ij1)) && j1!=j2){
    if(this.getCellValue(ij1) == "P"){
      this.cells[i2+1][j2] = null;
    } 
    else
      this.cells[i2-1][j2] = null;
  }

  //castling
  if (this.getCellValue(ij1) == "K"){
    if (this.castling.indexOf("K")>=0 && xy2=={x:"f",y:1}){
      //rook at {x:"a",y:"8"}
      this.cells[7][7] = null;
      this.cells[7][5] = new Tile({x:"f",y:1},"R");
    }else if (this.castling.indexOf("Q")>=0 && xy2=={x:"c",y:1}){
      this.cells[7][0] = null;
      this.cells[7][3] = new Tile({x:"d",y:1},"R");
    }
  }

  if (this.getCellValue(ij1) == "k"){
    if (this.castling.indexOf("k")>=0 && xy2=={x:"f",y:8}){
      //rook at {x:"a",y:"8"}
      this.cells[0][7] = null;
      this.cells[0][5] = new Tile({x:"f",y:8},"r");
    }else if (this.castling.indexOf("q")>=0 && xy2=={x:"c",y:8}){
      this.cells[0][0] = null;
      this.cells[0][3] = new Tile({x:"d",y:8},"r");
    }
  }


  //pown promotion
  var value = this.cells[i1][j1].value;
  if (move.length >4 && /[Pp]/.test(this.getCellValue(ij1)))
    value = move[4];
    if (this.activeColor === "w")
      value = value.toUpperCase();


 //normal move
  this.cells[i2][j2] = new Tile(xy2,value);
  if (! (i1 == i2 && j1 ==j2))
    this.cells[i1][j1] = null;

  //change state
  if (this.activeColor === "w")
    this.nfullmove += 1;
  this.switchPlayer();
  this.lastmove = move;
};

Grid.prototype.switchPlayer = function(){
  if(this.activeColor == "w")
    this.activeColor = "b";
  else
    this.activeColor = "w";
}


Grid.prototype.positionTranslateXY2IJ = function(xy){
  var s = "abcdefgh";
  return { i: 8-xy.y,j: s.indexOf(xy.x) };
}

Grid.prototype.positionTranslateIJ2XY = function(ij){
  var i = ij.i;
  var j = ij.j;
  var s = "abcdefgh";
  return {x: s[j],y:8-i};
};

// Build a grid of the specified size
Grid.prototype.empty = function () {
  var cells = [];


  for (var x = 0; x < this.size; x++) {
    var row = cells[x] = [];

    for (var y = 0; y < this.size; y++) {
      row.push(null);
    }
  }

  return cells;
};

Grid.prototype.getCells = function(){
  return this.cells;
};


// Call callback for every cell
Grid.prototype.eachCell = function (callback) {
  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      callback(x, y, this.cells[x][y]);
    }
  }
};


Grid.prototype.serialize = function () {
  var cellState = [];

  for (var x = 0; x < this.size; x++) {
    var row = cellState[x] = [];

    for (var y = 0; y < this.size; y++) {
      row.push(this.cells[x][y] ? this.cells[x][y].serialize() : null);
    }
  }

  return {
    size: this.size,
    cells: cellState
  };
};
