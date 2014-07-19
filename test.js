var FFT = require("./lib/complex.js")

// set run to 1 for real numbers, 2 for complex numbers
function kahanDiff(x, xOffset, xStride, y, yOffset, yStride, n, run) {
	var sum = 0.0,
		compensation = 0.0

	for (var i = 0; i < x.length / run / xStride; i++) {
		for (var j = 0; j < run; j++) {
			var v = Math.abs(x[xOffset + run * xStride * i + j] - y[yOffset + run * yStride * i + j] / n) - compensation

			var t = sum + v

			compensation = (t - sum) - v

			sum = t

			if (isNaN(sum)) {
				// debugger
			}
		}
	}

	return sum
}

function toArray(a) {
	return Array.prototype.slice.call(a)
}
function half(n) {
	return n/2
}

function testSimpleRealFFT(debug) {
	var fft = new FFT.complex(4/2, false)
	var io = [
		// time       //freq (dc, nyquist, bin1_r/bin3_r, bin1_i/-bin3_i)
		[0, 0, 0, 0], [0, 0, 0, 0], // zeros
		[1, 1, 1, 1], [4, 0, 0, 0], // DC
		[1, 0, 0, 0], [1, 1, 1, 0], // dirac
		[0, 1, 0, 0], [1,-1, 0,-1], // dirac shifted 1
		[1, 0,-1, 0], [0, 0, 2, 0], // cosine
		[0, 1, 0,-1], [0, 0, 0,-2], // sine
		[1,-1, 1,-1], [0, 4, 0, 0]  // nyquist
	]
	for (var i = 0; i < io.length/2; i++) {
		var input = new Float64Array(io[2*i])
		var o = new Float64Array(io[2*i+1])
		var output = new Float64Array(4)
		fft.simple(output, input, 'real')
		for (var j = 0; j < 4; j++) {
			if (isNaN(output[j]) || Math.abs(o[j] - output[j]/2) > 1e-12) {
				console.log("Failed: ", toArray(input))
				console.log("Expected: ", toArray(o))
				console.log("Got: ", toArray(output).map(half))
				break;
			}
		}
	}
}
function testSimpleRealFFT2(debug) {
	var s = Math.SQRT1_2
	var fft = new FFT.complex(8/2, false)
	var io = [
		// time       //freq (dc, nyquist, bin1_r/bin3_r, bin1_i/-bin3_i)
		[0, 0, 0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0], // zeros
		[1, 1, 1, 1, 1, 1, 1, 1], [8, 0, 0, 0, 0, 0, 0, 0], // DC
		[1, 0, 0, 0, 0, 0, 0, 0], [1, 1, 1, 0, 1, 0, 1, 0], // dirac
		[0, 1, 0, 0, 0, 0, 0, 0], [1,-1, s,-s, 0,-1,-s,-s], // dirac shifted 1
		[1, s, 0,-s,-1,-s, 0, s], [0, 0, 4, 0, 0, 0, 0, 0], // cosine
		[0, s, 1, s, 0,-s,-1,-s], [0, 0, 0,-4, 0, 0, 0, 0], // sine
		[1,-1, 1,-1, 1,-1, 1,-1], [0, 8, 0, 0, 0, 0, 0, 0]  // nyquist
	]
	for (var i = 0; i < io.length/2; i++) {
		var input = new Float64Array(io[2*i])
		var o = new Float64Array(io[2*i+1])
		var output = new Float64Array(8)
		fft.simple(output, input, 'real')
		for (var j = 0; j < 8; j++) {
			if (isNaN(output[j]) || Math.abs(o[j] - output[j]/2) > 1e-12) {
				console.log("Failed: ", toArray(input))
				console.log("Expected: ", toArray(o))
				console.log("Got: ", toArray(output).map(half))
				break;
			}
		}
	}
}
console.log("n = 4")
testSimpleRealFFT();
console.log("n = 8")
testSimpleRealFFT2();

function testRealFFT(n, debug) {
	// DC
	// impulse response
	// impulse response delayed 1 sample
	// cos
	// sin
	// nyquist
}
