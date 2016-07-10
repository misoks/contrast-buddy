var canvas;
var context;
var MAX_VAR = 16256;
var MIN_VAR = 0;
var imageSize;
var lumList = Array();
var uniqueLums = Array();
var instanceArr = Array();

$(document).ready(function(e){
	$("#uploadimage").on('submit',(function(e) {
		e.preventDefault();
		var img = document.getElementById('test-img');
		canvas = document.createElement('canvas');
		canvas.width = img.width;
		canvas.height = img.height;
		context = canvas.getContext('2d');
		imageSize = img.width * img.height;
		canvas.getContext('2d').drawImage(img, 0, 0, img.width, img.height);
		testImage();
	}));
	// Function to preview image after validation
	$("#file").change(function() {
		var file = this.files[0];
		var reader = new FileReader();
		reader.onload = imageIsLoaded;

		reader.readAsDataURL(this.files[0]);
		document.getElementById('image-name').innerHTML = this.files[0].name;
		
	});
});


var imageIsLoaded = function(e) {
	$('#test-button').show(50);

	$('#test-img').attr('src', e.target.result);
	$('#prev-img').attr('src', e.target.result);
	$('#prev-img').fadeIn(200);
	$('#image-name').fadeIn(200);
	//$('#test-img').css("display", "block");
};
var testImage = function() {
	d3.select("#visualizer").selectAll("circle").remove();
	d3.select("#visualizer2").selectAll("rect").remove();
	startProcessing(analyze);
	return false;
}

var startProcessing = function (callback) {
	$("#overlay").fadeIn(200, callback);
	return false;
}
var analyze = function() {
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
	return false;
}

var showResults = function () {
	var jitter;
	var lum;
	for (var i = 0; i < lumList.length; i = i+2) {
		jitter = Math.floor((Math.random() * 12)) - 6;
		lum = lumList[i];
		if (lum < 4) lum = lum + 4;
		d3.select("#visualizer").append("circle").attr("cx", lum - 2).attr("cy", 8 + jitter).attr("r", 2).attr("class", "graph__dot");
	}

	var max = getMax(lumList);
	var min = getMin(lumList);
	var range = max - min;
	var stdDev = getStandardDeviation(lumList, 2);
	var avg = getAverageFromNumArr(lumList, 2);

	// Draw range
	d3.select("#visualizer2").append("rect").attr("x", min).attr("y", 7.5).attr("width", range).attr("height", 1).attr("class", "graph__range");

	//Draw inner quartiles
	d3.select("#visualizer2").append("rect").attr("x", avg - stdDev).attr("y", 2).attr("width", stdDev * 2).attr("height", 12).attr("class", "graph__inner-quart");

	//Draw average
	d3.select("#visualizer2").append("rect").attr("x", avg - 1).attr("y", 0).attr("width", 2).attr("height", 16).attr("class", "graph__avg");

	//Draw max and min
	d3.select("#visualizer2").append("rect").attr("x", min).attr("y", 2).attr("width", 2).attr("height", 12).attr("class", "graph__avg");
	d3.select("#visualizer2").append("rect").attr("x", max - 2).attr("y", 2).attr("width", 2).attr("height", 12).attr("class", "graph__avg");


	document.getElementById('lum-max').innerHTML = max;
	document.getElementById('lum-min').innerHTML = min;
	document.getElementById('lum-unique').innerHTML = instanceArr[0];
	document.getElementById('lum-average').innerHTML = avg;
	document.getElementById('lum-variance').innerHTML = Math.round(getVariance(lumList, 0));
	document.getElementById('lum-std-dev').innerHTML = stdDev;
	$("#overlay").fadeOut(400);
	lumList = [];
	instanceArr = [];
	uniqueLums = [];
	return false;
}

var countLums = function(uniqueLums) {
	var count = 0;
	var instanceArr = Array();
	instanceArr[0] = 0;
	for (i=0; i < uniqueLums.length; i++) {
		if (uniqueLums[i] > -1) {
			count++;
			instanceArr.push(i);
		}
	}
	instanceArr[0] = count;
	return instanceArr;
}
var isArray = function (obj) {
	return Object.prototype.toString.call(obj) === "[object Array]";
}
var getNumWithSetDec = function( num, numOfDec ){
	var pow10s = Math.pow( 10, numOfDec || 0 );
	return ( numOfDec ) ? Math.round( pow10s * num ) / pow10s : num;
}
var getAverageFromNumArr = function( numArr, numOfDec ){
	if( !isArray( numArr ) ){ return false;	}
	var i = numArr.length, 
		sum = 0;
	while( i-- ){
		sum += numArr[ i ];
	}
	return getNumWithSetDec( (sum / numArr.length ), numOfDec );
}
var getMax = function(numArr) {
	var max = 0;
	for (var i = 0; i < numArr.length; i++) {
		if (numArr[i] > max) max = numArr[i];
	}
	return max;
}
var getMin = function(numArr) {
	var min = 100000000;
	for (var i = 0; i < numArr.length; i++) {
		if (numArr[i] < min) min = numArr[i];
	}
	return min;
}
var getVariance = function( numArr, numOfDec ){
	if( !isArray(numArr) ){ return false; }
	var avg = getAverageFromNumArr( numArr, numOfDec ), 
		i = numArr.length,
		v = 0;
 
	while( i-- ){
		v += Math.pow( (numArr[ i ] - avg), 2 );
	}
	v /= numArr.length;
	return getNumWithSetDec( v, numOfDec );
}
var getStandardDeviation = function( numArr, numOfDec ){
	if( !isArray(numArr) ){ return false; }
	var stdDev = Math.sqrt( getVariance( numArr, numOfDec ) );
	return getNumWithSetDec( stdDev, numOfDec );
};
