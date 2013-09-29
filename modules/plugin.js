//------------------------------------------------------------------
// Class definition / inheritance
//------------------------------------------------------------------
function GCodePlugin(options) {
  if (!(this instanceof GCodePlugin))
    return new GCodePlugin(options);

  //this.array_block = [];
}

//------------------------------------------------------------------
// Prototype
//------------------------------------------------------------------
GCodePlugin.prototype.processData = function(data) {
  var result = "";
  
  //result += this._pauseAtHeight(data, 0.50);
  //result += this._pauseAtLayer(data, 0);
  //result += this._pauseAtLayer(data, 5);
  //result += this._pauseAtLayer(data, 10);
  //result += this._pauseAtLayer(data, 15);

  return result;
};

GCodePlugin.prototype._pauseAtLayer = function(data, layer) {

  if (data === undefined) {
    return "";
  }

  var result = "";
  var gcode = data.toString();
  if (gcode.trim().length == 0) {
    return "";
  }  

  //console.log("[%s]", gcode);
  if (gcode.indexOf(";LAYER:"+layer.toString()) >= 0) {
    /*
    console.log("-----------------------------------------------------");
    console.log("[Plugin]: Found Layer Change: LAYER%s",layer.toString());
    console.log("-----------------------------------------------------");  */

    // pauseAtLayer -> Sends extruder to XY ZERO position and waits 10seconds (same Z position)
    var array_result = [];
    array_result.push("G0 F8000 X0.00 Y0.00"); // send extruder to XY ZERO position with fast movement (no retraction)
    //array_result.push("G4 P10000"); // waits 10 seconds

    result = array_result.join('\n');
  }

  return result;  
};

//------------------------------------------------------------------
// export
//------------------------------------------------------------------
module.exports = {
  GCodePlugin: GCodePlugin
};
//------------------------------------------------------------------

//------------------------------------------------------------------
// sample
//var plugin = new GCodePlugin({pauseAtLayer: 10});
//------------------------------------------------------------------
