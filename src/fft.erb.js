<%= $:.unshift('.'); require "#{File.dirname(__FILE__)}/../src/fft.rb"; File.read "#{File.dirname(__FILE__)}/../LICENSE" %>

(function export_FFT(root, factory) {
	if (typeof define === "function" && define.amd) {
		define([], factory)
	} else if (typeof exports === 'object') {
		module.exports = factory()
	} else {
		root.FFT = factory()
	}
}(this, function module_FFT() {
	"use strict"

	function butterfly2(output, outputOffset, outputStride, fStride, state, m) {
		var t = state.twiddle

		for (var i = 0; i < m; i++) {
			<%= cload('s0', 'output', 'outputOffset', 'i', 'outputStride') %>
			<%= cload('s1', 'output', 'outputOffset', 'i + m', 'outputStride') %>

			<%= cload('t1', 't', 0, 'i', 'fStride') %>

			<%= cmul('v1', 's1', 't1') %>

			<%= cadd('r0', 's0', 'v1') %>
			<%= csub('r1', 's0', 'v1') %>

			<%= cstore('r0', 'output', 'outputOffset', 'i', 'outputStride') %>
			<%= cstore('r1', 'output', 'outputOffset', 'i + m', 'outputStride') %>
		}
	}

	function butterfly3(output, outputOffset, outputStride, fStride, state, m) {
		var t = state.twiddle
		var m1 = m, m2 = 2 * m
		var fStride1 = fStride, fStride2 = 2 * fStride

		var e = <%= imag('t', 0, 'm', 'fStride') %>

		for (var i = 0; i < m; i++) {
			<%= cload('s0', 'output', 'outputOffset', 'i', 'outputStride') %>

			<%= cload('s1', 'output', 'outputOffset', 'i + m1', 'outputStride') %>
			<%= cload('t1', 't', 0, 'i', 'fStride1') %>
			<%= cmul('v1', 's1', 't1') %>

			<%= cload('s2', 'output', 'outputOffset', 'i + m2', 'outputStride') %>
			<%= cload('t2', 't', 0, 'i', 'fStride2') %>
			<%= cmul('v2', 's2', 't2') %>

			<%= cadd('i0', 'v1', 'v2') %>

			<%= cadd('r0', 's0', 'i0') %>
			<%= cstore('r0', 'output', 'outputOffset', 'i', 'outputStride') %>

			var i1_r = s0_r - i0_r * 0.5
			var i1_i = s0_i - i0_i * 0.5

			var i2_r = (v1_r - v2_r) * e
			var i2_i = (v1_i - v2_i) * e

			var r1_r = i1_r - i2_i
			var r1_i = i1_i + i2_r
			<%= cstore('r1', 'output', 'outputOffset', 'i + m1', 'outputStride') %>

			var r2_r = i1_r + i2_i
			var r2_i = i1_i - i2_r
			<%= cstore('r2', 'output', 'outputOffset', 'i + m2', 'outputStride') %>
		}
	}

	function butterfly4(output, outputOffset, outputStride, fStride, state, m) {
		var t = state.twiddle
		var m1 = m, m2 = 2 * m, m3 = 3 * m
		var fStride1 = fStride, fStride2 = 2 * fStride, fStride3 = 3 * fStride

		for (var i = 0; i < m; i++) {
			<%= cload('s0', 'output', 'outputOffset', 'i', 'outputStride') %>

			<%= cload('s1', 'output', 'outputOffset', 'i + m1', 'outputStride') %>
			<%= cload('t1', 't', 0, 'i', 'fStride1') %>
			<%= cmul('v1', 's1', 't1') %>

			<%= cload('s2', 'output', 'outputOffset', 'i + m2', 'outputStride') %>
			<%= cload('t2', 't', 0, 'i', 'fStride2') %>
			<%= cmul('v2', 's2', 't2') %>

			<%= cload('s3', 'output', 'outputOffset', 'i + m3', 'outputStride') %>
			<%= cload('t3', 't', 0, 'i', 'fStride3') %>
			<%= cmul('v3', 's3', 't3') %>

			<%= cadd('i0', 's0', 'v2') %>
			<%= csub('i1', 's0', 'v2') %>
			<%= cadd('i2', 'v1', 'v3') %>
			<%= csub('i3', 'v1', 'v3') %>

			<%= cadd('r0', 'i0', 'i2') %>

			if (state.inverse) {
				var r1_r = i1_r - i3_i
				var r1_i = i1_i + i3_r
			} else {
				var r1_r = i1_r + i3_i
				var r1_i = i1_i - i3_r
			}

			<%= csub('r2', 'i0', 'i2') %>

			if (state.inverse) {
				var r3_r = i1_r + i3_i
				var r3_i = i1_i - i3_r
			} else {
				var r3_r = i1_r - i3_i
				var r3_i = i1_i + i3_r
			}

			<%= cstore('r0', 'output', 'outputOffset', 'i', 'outputStride') %>
			<%= cstore('r1', 'output', 'outputOffset', 'i + m1', 'outputStride') %>
			<%= cstore('r2', 'output', 'outputOffset', 'i + m2', 'outputStride') %>
			<%= cstore('r3', 'output', 'outputOffset', 'i + m3', 'outputStride') %>
		}
	}

	function butterfly(output, outputOffset, outputStride, fStride, state, m, p) {
		var t = state.twiddle, n = state.n, scratch = new Float64Array(2 * p)

		for (var u = 0; u < m; u++) {
			for (var q1 = 0, k = u; q1 < p; q1++, k += m) {
				<%= cload('x0', 'output', 'outputOffset', 'k', 'outputStride') %>
				<%= cstore('x0', 'scratch', 'q1') %>
			}

			for (var q1 = 0, k = u; q1 < p; q1++, k += m) {
				var tOffset = 0

				<%= cload('x0', 'scratch', 0) %>
				<%= cstore('x0', 'output', 'outputOffset', 'k', 'outputStride') %>

				for (var q = 1; q < p; q++) {
					tOffset = (tOffset + fStride * k) % n

					<%= cload('s0', 'output', 'outputOffset', 'k', 'outputStride') %>

					<%= cload('s1', 'scratch', 'q') %>
					<%= cload('t1', 't', 'tOffset') %>
					<%= cmul('v1', 's1', 't1') %>

					<%= cadd('r0', 's0', 'v1') %>
					<%= cstore('r0', 'output', 'outputOffset', 'k', 'outputStride') %>
				}
			}
		}
	}

	function work(output, outputOffset, outputStride, f, fOffset, fStride, inputStride, factors, state) {
		var p = factors.shift()
		var m = factors.shift()

		if (m == 1) {
			for (var i = 0; i < p * m; i++) {
				<%= cload('x0', 'f', 'fOffset', 'i', 'fStride * inputStride') %>
				<%= cstore('x0', 'output', 'outputOffset', 'i', 'outputStride') %>
			}
		} else {
			for (var i = 0; i < p; i++) {
				work(output, outputOffset + outputStride * i * m, outputStride, f, fOffset + i * fStride * inputStride, fStride * p, inputStride, factors.slice(), state)
			}
		}

		switch (p) {
			case 2: butterfly2(output, outputOffset, outputStride, fStride, state, m); break
			case 3: butterfly3(output, outputOffset, outputStride, fStride, state, m); break
			case 4: butterfly4(output, outputOffset, outputStride, fStride, state, m); break
			default: butterfly(output, outputOffset, outputStride, fStride, state, m, p); break
		}
	}

	var complex = function (n, inverse) {
		if (arguments.length < 2) {
			throw new RangeError("You didn't pass enough arguments, passed `" + arguments.length + "'")
		}

		var n = ~~n, inverse = !!inverse

		if (n < 1) {
			throw new RangeError("n is outside range, should be positive integer, was `" + n + "'")
		}

		var state = {
			n: n,
			inverse: inverse,

			factors: [],
			twiddle: new Float64Array(2 * n),
			scratch: new Float64Array(2 * n)
		}

		var t = state.twiddle, theta = 2 * Math.PI / n

		for (var i = 0; i < n; i++) {
			if (inverse) {
				var phase =  theta * i
			} else {
				var phase = -theta * i
			}

			<%= real('t', 'i') %> = Math.cos(phase)
			<%= imag('t', 'i') %> = Math.sin(phase)
		}

		var p = 4, v = Math.floor(Math.sqrt(n))

		while (n > 1) {
			while (n % p) {
				switch (p) {
					case 4: p = 2; break
					case 2: p = 3; break
					default: p += 2; break
				}

				if (p > v) {
					p = n
				}
			}

			n /= p

			state.factors.push(p)
			state.factors.push(n)
		}

		this.state = state
	}

	complex.prototype.simple = function (output, input, t) {
		this.process(output, 0, 1, input, 0, 1, t)
	}

	complex.prototype.process = function(output, outputOffset, outputStride, input, inputOffset, inputStride, t) {
		var outputStride = ~~outputStride, inputStride = ~~inputStride

		var type = !t ? 'complex' : t

		if (outputStride < 1) {
			throw new RangeError("outputStride is outside range, should be positive integer, was `" + outputStride + "'")
		}

		if (inputStride < 1) {
			throw new RangeError("inputStride is outside range, should be positive integer, was `" + inputStride + "'")
		}

		if (type == 'real' || type == 'realslow') {
			for (var i = 0; i < this.state.n; i++) {
				var x0_r = input[inputOffset + inputStride * i]
				var x0_i = 0.0

				<%= cstore('x0', 'this.state.scratch', 'i') %>
			}

			work(output, outputOffset, outputStride, this.state.scratch, 0, 1, 1, this.state.factors.slice(), this.state)
		} else {
			if (input == output) {
				work(this.state.scratch, 0, 1, input, inputOffset, 1, inputStride, this.state.factors.slice(), this.state)

				for (var i = 0; i < this.state.n; i++) {
					<%= cload('x0', 'this.state.scratch', 'i') %>

					<%= cstore('x0', 'output', 'outputOffset', 'i', 'outputStride') %>
				}
			} else {
				work(output, outputOffset, outputStride, input, inputOffset, 1, inputStride, this.state.factors.slice(), this.state)
			}
		}
	}

	// http://www.katjaas.nl/realFFT/realFFT2.html
	function realbifftstage(fdata, offset, stride, state, packed) {
		var n, f=state.n

		var flip = state.inverse ? -1 : 1
		var normalize = state.inverse ? 1 : 0.5

		for(n=state.n>>1; n>0; n--) {
			<%= cload('d0', 'fdata', 'offset', 'n', 'stride') %>
			<%= cload('d1', 'fdata', 'offset', 'f-n', 'stride') %>

			<%= cload('t0', 'state.twiddleReal', 'n') %>

			<%= cadd('x0', 'd0', 'd1') %>
			<%= csub('x1', 'd0', 'd1') %>

			var t_r = (x1_r * t0_i + x0_i * t0_r) * flip
			var t_i = (x0_i * t0_i - x1_r * t0_r) * flip

			var r0_r = (x0_r + t_r) * normalize
			var r0_i = (t_i + x1_i) * normalize

			var r1_r = (x0_r - t_r) * normalize
			var r1_i =  (t_i - x1_i) * normalize

			<%= cstore('r0', 'fdata', 'offset', 'n', 'stride') %>
			<%= cstore('r1', 'fdata', 'offset', 'f-n', 'stride') %>
		}
		<%= cload('y0', 'fdata', 'offset', '0') %>
		if (packed) {
			<%= real('fdata', 'offset') %> = y0_r + y0_i
			<%= imag('fdata', 'offset') %> = y0_r - y0_i
		} else {
			if (state.inverse) {
				<%= cload('y1', 'fdata', 'offset', 'f', 'stride') %>
				<%= real('fdata', 'offset') %> = y0_r + y1_r
				<%= imag('fdata', 'offset') %> = y0_r - y1_r
			} else {
				var y1_r = y0_r - y0_i
				var y1_i = 0
				y0_r = y0_r + y0_i
				y0_i = 0
				<%= cstore('y0', 'fdata', 'offset', '0') %>
				<%= cstore('y1', 'fdata', 'offset', 'f', 'stride') %>
			}
		}
	}

	var real = function (n, inverse) {
		if (n % 2 !== 0) {
			throw new RangeError("n should be even, was `" + n + "'")
		}

		this.state = (new complex(n/2, inverse)).state

		this.state.twiddleReal = new Float64Array(n)
		this.state.scratch = new Float64Array(n+2)

		var t = this.state.twiddleReal, theta = 2 * Math.PI / n

		for (var i = 0; i < n; i++) {
			if (inverse) {
				var phase =  theta * i
			} else {
				var phase = -theta * i
			}

			<%= real('t', 'i') %> = Math.cos(phase)
			<%= imag('t', 'i') %> = Math.sin(phase)
		}
	}

	real.prototype.simple = function (output, input) {
		this.process(output, 0, 1, input, 0, 1)
	}
	real.prototype.packed = function(output, input) {
		this.process(output, 0, 1, input, 0, 1, true)
	}
	real.prototype.process = function(output, outputOffset, outputStride, input, inputOffset, inputStride, packed) {
		if (this.state.inverse || input == output) {

			for (var i = 0; i < this.state.n + (packed ? 0 : 1); i++) {
				<%= cload('x0', 'input', 'inputOffset', 'i', 'inputStride') %>
				<%= cstore('x0', 'this.state.scratch', 'i') %>
			}

			if (this.state.inverse) {
				realbifftstage(this.state.scratch, 0, 1, this.state, packed)
			}

			input = this.state.scratch
			inputOffset = 0
			inputStride = 1
		}

		work(output, outputOffset, outputStride, input, inputOffset, 1, inputStride, this.state.factors.slice(), this.state)

		if (!this.state.inverse) realbifftstage(output, outputOffset, outputStride, this.state, packed)
	}

	var FFT = {
		complex: complex,
		real: real,
		inverse: {
			complex: function(n) {
				return new FFT.complex(n, true)
			},
			real: function(n) {
				return new FFT.real(n, true)
			}
		}
	}

	return FFT
}))
