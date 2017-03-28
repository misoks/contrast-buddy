var canvas;
var context;
var MAX_VAR = 16256;
var MIN_VAR = 0;
var imageSize;
var lumList = Array();
var uniqueLums = Array();
var instanceArr = Array();
var colorList = Array();
var excludeBGs = false;
var showColors = false;
var PRECISION = 1;
var leftX = 1;
var leftY = 1;
var early = true;
var processing;
var progress = 0;

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
		document.getElementById("img-select").innerHTML = "Change Image";
		
	});
	$(".data-point").hover(function(){
		console.log("hovered");
	});
});


var imageIsLoaded = function(e) {
	$('#test-area').show(50);

	$('#test-img').attr('src', e.target.result);
	$('#prev-img').attr('src', e.target.result);
	$('#prev-img').fadeIn(200);
	$('#image-name').fadeIn(200);
	//$('#test-img').css("display", "block");
};
var testImage = function() {
	d3.select("#lum-distro").selectAll("circle").remove();
	d3.select("#box-plot").selectAll("rect").remove();
	d3.select("#color-distro").selectAll("rect").remove();
	document.getElementById("results-message").innerHTML = "";
	$("#results-message").hide();
	if ($("#exclude-bg").is(":checked")) {
		excludeBGs = true;
	} else {
		excludeBGs = false;
	}
	if ($("#show-color").is(":checked")) {
		showColors = true;
		
	} else {
		showColors = false;
		
	}
	$("#overlay").fadeIn(200, startProcessing);
	return false;
}

var startProcessing = function () {
	var chunkSize = 300;
	
	var densityMod = Math.round(Math.sqrt(imageSize) / 100);
	if (densityMod < 1) densityMod = 1;

	processing = setInterval( analyze, 100, chunkSize, densityMod);

	return false;
}
var analyze = function(chunkSize, densityMod) {
	var pixel;
	var rgb;
	var startX;
	var startY;
	var count = 0;
	

	if ( (leftX + densityMod)<(canvas.width - 1) ) {
		startX = leftX;
		startY = leftY;
	} else {
		startX = 1;
		startY = leftY + densityMod;
	}


	for (var y = startY; y < (canvas.height - 1); y = y+densityMod) {
		if ((x + densityMod)>(canvas.width - 1)) {
			startX = 1;
		}
		for (var x = startX; x < (canvas.width - 1); x = x+densityMod) {
			count++;
			if (count > chunkSize) {
				leftY = y;
				leftX = x;
				early = true;
				break;
			}
			early = false;
			pixel = context.getImageData(x, y, 1, 1).data;
			rgb = pixel[0] + "," + pixel[1] + "," + pixel[2];
			luminance = (0.2126 * pixel[0]) + (0.7152 * pixel[1]) + (0.0722 * pixel[2]);
			luminance = Math.round(luminance/PRECISION) * PRECISION;
			//lumList.push(luminance + " X: " + x + " Y: " + y);
			lumList.push(luminance);
			colorList.push(rgb);
		}
		if (early) break;
	}
	var percent =  ((leftY * canvas.width) / imageSize) * 100;

	document.getElementById("progress").value = Math.round(percent + 1);
	if ( ((y + densityMod) > canvas.height) && ((x + densityMod) > canvas.width) ) {
		finishProcessing(processing);
	}
}
var finishProcessing = function(processing) {
	clearInterval(processing);
	showResults();
}

var removeRange = function (percentage, greaterThan) {
	var instances;
	var excludedLums = Array();
	var newLumList = Array();
	var newColorList = Array();
	var total = lumList.length;
	var lum;

	for (var lum = 0; lum < uniqueLums.length; lum++) {
		instances = uniqueLums[lum];
		
		if (instances > 0) {
			if (greaterThan) {
				if ((instances / total) > percentage) excludedLums.push(lum);
			} else {
				if ((instances / total) < percentage) excludedLums.push(lum);
			}
		}
	}

	for (var i = 0; i < lumList.length; i++) {
		lum = lumList[i];
		color = colorList[i];
		if (excludedLums.indexOf(lum) > -1) {
			continue;
		} else {
			newLumList.push(lum);
			newColorList.push(color);
		}
	}
	lumList = [];
	colorList = [];
	
	lumList = newLumList;
	colorList = newColorList;
}

var countUnique = function () {
	uniqueLums = [];
	instanceArr = [];
	// Count unique luminances
	for (var i = 0; i < lumList.length; i++) {
		if (!uniqueLums[lumList[i]]) {
			uniqueLums[lumList[i]] = 1;
		} else {
			uniqueLums[lumList[i]] = uniqueLums[lumList[i]] + 1;
		}
	}
	instanceArr = countLums(uniqueLums);
}
var showResults = function () {
	var jitter;
	var jitter2;
	var lum;

	// Remove colors that cover less than .05% of the screen
	removeRange(.005, false);
	countUnique();

	// Remove background colors
	if (excludeBGs) {
		removeRange(.25, true);
		countUnique();
	}

	// Handle the case that there are no luminances
	if (lumList.length < 1) {
		d3.select("#lum-distro").selectAll("circle").remove();
		d3.select("#color-distro").selectAll("rect").remove();
		d3.select("#box-plot").selectAll("rect").remove();
		document.getElementById("results-message").innerHTML = "No luminances found! Try unchecking Exclude Background Colors and run the test again.";
		document.getElementById('lum-max').innerHTML = "&mdash;";
		document.getElementById('lum-min').innerHTML = "&mdash;";
		document.getElementById('lum-unique').innerHTML = "&mdash;";
		document.getElementById('lum-average').innerHTML = "&mdash;";
		document.getElementById('lum-variance').innerHTML = "&mdash;";
		document.getElementById('lum-std-dev').innerHTML = "&mdash;";
		$("#results-message").fadeIn(200);
		endDisplayResults();
		return false;
	}

	// Determine how opaque each dot on the luminance graph should be based on how many points we're plotting
	var opacity = 200 / lumList.length;
	var fill;

	// Draw the dots onto the graph
	for (var i = 0; i < lumList.length; i++) {
		jitter = Math.floor((Math.random() * 12)) - 6;
		lum = lumList[i];
		if (lum < PRECISION) lum = lum + PRECISION;
		
		d3.select("#lum-distro").append("circle")
			.attr("cx", lum - (PRECISION / 2))
			.attr("cy", 8 + jitter)
			.attr("r", PRECISION / 2)
			.attr("class", "graph__dot")
			.style("opacity", opacity)
			.attr("fill", "rgb(0,0,0)");

		fill = "rgb(" + colorList[i] + ")";
		//jitter2 = Math.floor((Math.random() * 4)) - 2;
		d3.select("#color-distro").append("rect")
			.attr("x", lum - PRECISION)
			.attr("y", 2)
			.attr("width", PRECISION)
			.attr("height", 3)
			.attr("class", "graph__dot")
			.attr("fill", fill);
	}

	var max = getMax(lumList);
	var min = getMin(lumList);
	var q1 = quartile(lumList, 25);
	var q2 = quartile(lumList, 50);
	var q3 = quartile(lumList, 75);
	var range = max - min;
	var stdDev = getStandardDeviation(lumList, 2);
	var avg = getAverageFromNumArr(lumList, 2);

	// Draw range
	d3.select("#box-plot").append("rect")
		.attr("x", min).attr("y", 7.5)
		.attr("width", range)
		.attr("height", 1)
		.attr("class", "graph__range");

	//Draw inner quartiles
	d3.select("#box-plot").append("rect")
		.attr("x", q1).attr("y", 2)
		.attr("width", q3 - q1)
		.attr("height", 12)
		.attr("class", "graph__inner-quart");

	//Draw median
	d3.select("#box-plot").append("rect")
		.attr("x", q2 - .5)
		.attr("y", 0)
		.attr("width", 1)
		.attr("height", 16)
		.attr("class", "graph__med");

	//Draw max and min
	d3.select("#box-plot").append("rect")
		.attr("x", min)
		.attr("y", 4)
		.attr("width", 1)
		.attr("height", 8)
		.attr("class", "graph__med");
	d3.select("#box-plot").append("rect")
		.attr("x", max - 1)
		.attr("y", 4)
		.attr("width", 1)
		.attr("height", 8)
		.attr("class", "graph__med");

	//Draw mean
	d3.select("#box-plot").append("rect")
		.attr("x", avg - .5)
		.attr("y", 0)
		.attr("width", 1)
		.attr("height", 16)
		.attr("class", "data-point graph__avg")
		.attr("data-value", avg)
		.attr("data-name", "Mean")
		.on('mouseover',function() {
			hoverStart(this)
		})
      	.on('mouseout',function() {
      		hoverEnd(this)
      	});


	document.getElementById('lum-max').innerHTML = max;
	document.getElementById('lum-min').innerHTML = min;
	document.getElementById('lum-unique').innerHTML = instanceArr[0];
	document.getElementById('lum-average').innerHTML = avg;
	document.getElementById('lum-variance').innerHTML = Math.round(getVariance(lumList, 0));
	document.getElementById('lum-std-dev').innerHTML = stdDev;

	endDisplayResults();
	return false;
}
var endDisplayResults = function() {
	$("#results-pane").fadeIn(400);
	$("#overlay").fadeOut(400);
	leftX = 1;
	leftY = 1;
	early = true;
	progress = 0;
	processing = false;
	lumList = [];
	instanceArr = [];
	uniqueLums = [];
	colorList = [];
	document.getElementById("progress").value = 0;
}
var hoverStart = function(elem) {
	var value = $(elem).attr("data-value");
	var name = $(elem).attr("data-name");
	
}
var hoverEnd = function(elem) {
	console.log(elem);
}
var countLums = function(uniqueLums) {
	var count = 0;
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
	if (numArr.length < 1) return false;
	var max = 0;
	for (var i = 0; i < numArr.length; i++) {
		if (numArr[i] > max) max = numArr[i];
	}
	return max;
}
var getMin = function(numArr) {
	if (numArr.length < 1) return false;
	var min = 100000000;
	for (var i = 0; i < numArr.length; i++) {
		if (numArr[i] < min) min = numArr[i];
	}
	return min;
}
var quartile =  function(array, percent){ /** @param percent - pass 25 for lower quartile, 75 for upper, 50 for median. Defaults to 50 */
     if (!percent) percent = 50;
     array = array.sort(function(a, b){return a-b});
     var n = Math.round(array.length * percent / 100);
     return array[n];
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
