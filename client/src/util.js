export const PREC = 5; // sig figs

// left pads a string better than left-pad ever did
export function leftPad(string, n) {
	while (string.length < n) {
		string = "0" + string;
	}
	return string;
}

// Date -> HH:mm:ss:mill
export function timeString(time) {
	let hr = leftPad(time.getHours().toFixed(0), 2);
	let min = leftPad(time.getMinutes().toFixed(0), 2);
	let sec = leftPad(time.getSeconds().toFixed(0), 2);
	let ms = leftPad(time.getMilliseconds().toFixed(0), 4);
	return `${hr}:${min}:${sec}:${ms}`;
}

export function handleClientAsyncError(error) {
	alert("An error occured while processing your request. Please reload the page.");
	console.error(error);
}

export function handleServerError(response) {
	if (response.error) {
		console.warn(response.error);
		alert(response.error);
	} else {
		return response;
	}
}