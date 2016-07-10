self.addEventListener('message', function(e) {
  var data = e.data;
  switch (data.cmd) {
    case 'start':
      self.postMessage('WORKER STARTED: ' + data.msg);
      analyze();
      break;
    case 'stop':
      self.postMessage('WORKER STOPPED: ' + data.msg +
                       '. (buttons will no longer work)');
      self.close(); // Terminates the worker.
      break;
   	 default:
      self.postMessage('Unknown command: ' + data.msg);
  };
}, false);


var analyze = function(canvas) {
	var pixel;
	var densityMod = Math.round(Math.sqrt(imageSize) / 200);
	if (densityMod < 1) densityMod = 1;

	for (var y = 1; y < (canvas.height); y = y+densityMod) {
		for (var x = 1; x < (canvas.width); x = x+densityMod) {
			pixel = context.getImageData(x, y, 1, 1).data;
			luminance = (0.2126 * pixel[0]) + (0.7152 * pixel[1]) + (0.0722 * pixel[2]);
			luminance = Math.round(luminance/5) * 5;
			if (!uniqueLums[luminance]) {
				uniqueLums[luminance] = 1;
			} else {
				uniqueLums[luminance] = uniqueLums[luminance] + 1;
			}
			
			lumList.push(luminance);
		}
	}
	instanceArr = countLums(uniqueLums);
	showResults();
	self.postMessage("done");
	return false;
}