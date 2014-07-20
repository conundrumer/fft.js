var FFT = require("./lib/fft.js")

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

function testSimpleRealFFT(debug) {
	var N = 4;
	var fft = new FFT.real(N)
	var ifft = new FFT.inverse.real(N)
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
		var output = new Float64Array(N)
		fft.simple(output, input)
		for (var j = 0; j < N; j++) {
			if (isNaN(output[j]) || Math.abs(o[j] - output[j]) > 1e-12) {
				console.log("Failed: ", toArray(input))
				console.log("Expected: ", toArray(o))
				console.log("Got: ", toArray(output).map(half))
				break;
			}
		}
		ifft.simple(output, o)
		for (var k = 0; k < N; k++) {
			if (isNaN(output[k]) || Math.abs(input[k] - output[k]/N) > 1e-12) {
				console.log("Failed: ", toArray(o))
				console.log("Expected: ", toArray(input))
				console.log("Got: ", toArray(output))
				break;
			}
		}
	}
}

function testSimpleRealFFT2(debug) {
	var N = 8
	var s = Math.SQRT1_2
	var fft = new FFT.real(N)
	var ifft = new FFT.inverse.real(N)
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
		var output = new Float64Array(N)
		fft.simple(output, input)
		for (var j = 0; j < N; j++) {
			if (isNaN(output[j]) || Math.abs(o[j] - output[j]) > 1e-12) {
				console.log("Failed: ", toArray(input))
				console.log("Expected: ", toArray(o))
				console.log("Got: ", toArray(output).map(half))
				break;
			}
		}
		ifft.simple(output, o)
		for (var k = 0; k < N; k++) {
			if (isNaN(output[k]) || Math.abs(input[k] - output[k]/N) > 1e-12) {
				console.log("Failed: ", toArray(o))
				console.log("Expected: ", toArray(input))
				console.log("Got: ", toArray(output))
				break;
			}
		}
	}
}

function fill(output, input) {
	for (var i = 0; i < input.length; i++) {
		output[i] = input[i]
	}
}

function generateTestSignals(N) {
	return [
		['DC', function(){return 1}],
		['dirac', function(n){return n === 0 ? 1 : 0}],
		['dirac_shift1', function(n) {return n === 1 ? 1 : 0}],
		['cosine', function(n, N) {return Math.cos(2*Math.PI*n/N)}],
		['sine', function(n, N) {return Math.sin(2*Math.PI*n/N)}],
		['nyquist', function(n) {return n%2}],
		['white_noise', function() {return Math.random()}]
	].map(function(param) {
		return new Signal(param[0], param[1], N)
	})
}

var epsilon = 1e-10
function testRealFFT(N, debug) {
	if (debug) {
		console.log("Testing N=",N)
	}
	var fft = new FFT.real(N)
	var ifft = new FFT.inverse.real(N)
	var input = new Float64Array(N)
	var output = new Float64Array(N)
	var signals = generateTestSignals(N)
	var diff
	signals.forEach(function(signal) {
		fill(input, signal.time)
		fft.simple(output, input)
		diff = kahanDiff(signal.freq, 0, 1, output, 0, 1, 1, 1) // normalized
		if ( isNaN(diff) || diff > epsilon) {
			console.log("Forward FFT Failed:", signal.name, N, ", Error: ", diff)
			if (debug) {
				console.log("expected:", signal.freq)
				console.log("result:", toArray(output))
			}
		}

		fill(input, signal.freq)
		ifft.simple(output, input)
		diff = kahanDiff(signal.time, 0, 1, output, 0, 1, N, 1) // not normalized
		if ( isNaN(diff) || diff > epsilon) {
			console.log("Inverse FFT Failed:", signal.name, N, ", Error: ", diff)
			if (debug) {
				console.log("expected:", signal.time)
				console.log("result:", toArray(output))
			}
		}
	})
}

// dft
function makeBin(time, k, N) {
	return time.map(function(x_n, n) {
		var phase = -2 * Math.PI * k * n / N
		return [x_n*Math.cos(phase), x_n*Math.sin(phase)]
	}).reduce(function(a,b){
		return [a[0]+b[0],a[1]+b[1]]
	})
}

function Signal(name, fn, N) {
	this.name = name;
	this.time = []
	for (var n = 0; n < N; n++) {
		this.time[n] = fn(n, N)
	}
	this.freq = []
	for (var k = 0; k <= N/2; k++) {
		var bin = makeBin(this.time, k, N)
		this.freq[2*k] = bin[0]
		this.freq[2*k+1] = bin[1]
	}
	this.freq[1] = this.freq[N]
	this.freq.length = N
}

console.log("testing n = 4")
testSimpleRealFFT();
console.log("testing n = 8")
testSimpleRealFFT2();
console.log("testing n = 4 to 128, evens")
for (var i = 4; i <= 128; i += 2) {
	testRealFFT(i, false)
}
console.log("done")
