//////////////////////////////
///          Init          ///
//////////////////////////////
import { BareMuxConnection } from "https://unpkg.com/@mercuryworkshop/bare-mux@2.1.7/dist/index.mjs";

//////////////////////////////
///         Options        ///
//////////////////////////////
const connection = new BareMuxConnection("/bareworker.js");

let wispURL;
let transportURL;

export let tabCounter = 0;
export let currentTab = 0;
export let framesElement;
export let currentFrame;
export const addressInput = document.getElementById("address");

requestIdleCallback(async () => {
await import(`/scram/scramjet.all.js`);

const { ScramjetController } = window.$scramjetLoadController();

const scramjet = new ScramjetController({
	files: {
		wasm: `/scram/scramjet.wasm.wasm`,
		all: `/scram/scramjet.all.js`,
		sync: `/scram/scramjet.sync.js`,
	},
	siteFlags: {
		"https://www.google.com/(search|sorry).*": {
			naiiveRewriter: true,
		},
	},
});

scramjet.init();
window.scramjet = scramjet;
});
const transportOptions = {
	epoxy: "https://unpkg.com/@mercuryworkshop/epoxy-transport@2.1.27/dist/index.mjs",
	libcurl: "https://unpkg.com/@mercuryworkshop/libcurl-transport@1.5.0/dist/index.mjs",
};

//////////////////////////////
///           SW           ///
//////////////////////////////
const stockSW = "./ultraworker.js";
const swAllowedHostnames = ["localhost", "127.0.0.1"];

/**
 * Registers the service worker if supported and allowed.
 * @returns {Promise<void>}
 * @throws Will throw if service workers are unsupported or not HTTPS on disallowed hosts.
 */
async function registerSW() {
	if (!navigator.serviceWorker) {
		if (
			location.protocol !== "https:" &&
			!swAllowedHostnames.includes(location.hostname)
		)
			throw new Error("Service workers cannot be registered without https.");

		throw new Error("Your browser doesn't support service workers.");
	}

	try {
		await navigator.serviceWorker.register(stockSW);
	} catch (error) {
		console.error('Service Worker registration failed:', error);
		throw new Error(`Service Worker registration failed: ${error.message}`);
	}
}

if (window.self === window.top) {
	try {
		await registerSW();
		console.log("lethal.js: Service Worker registered");
	} catch (error) {
		console.error("Failed to register Service Worker:", error);
		// Don't throw here - allow app to continue even if SW fails
	}
}

//////////////////////////////
///        Functions       ///
//////////////////////////////

/**
 * Creates a valid URL from input or returns a search URL.
 * Validates and sanitizes input to prevent malicious URLs.
 * @param {string} input - The input string or URL.
 * @param {string} [template="https://search.brave.com/search?q=%s"] - Search URL template.
 * @returns {string} Valid URL string.
 * @throws {Error} If the URL contains dangerous protocols.
 */
export function makeURL(input, template = "https://search.brave.com/search?q=%s") {
	// Sanitize input
	const sanitized = input.trim();

	// Blocked protocols for security
	const blockedProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:'];
	const lowerInput = sanitized.toLowerCase();

	for (const protocol of blockedProtocols) {
		if (lowerInput.startsWith(protocol)) {
			throw new Error(`Protocol "${protocol}" is not allowed for security reasons`);
		}
	}

	try {
		const url = new URL(sanitized);
		// Only allow http and https protocols
		if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol)) {
			throw new Error(`Protocol "${url.protocol}" is not allowed`);
		}
		return url.toString();
	} catch (err) {
		// If not a valid URL, treat as search query
		if (err.message && err.message.includes('not allowed')) {
			throw err;
		}
	}

	return template.replace("%s", encodeURIComponent(sanitized));
}

/**
 * Updates BareMux connection with current transport and wisp URLs.
 * @returns {Promise<void>}
 * @throws {Error} If connection setup fails.
 */
async function updateBareMux() {
	if (transportURL != null && wispURL != null) {
		try {
			console.log(`lethal.js: Setting BareMux to ${transportURL} and Wisp to ${wispURL}`);
			await connection.setTransport(transportURL, [{ wisp: wispURL }]);
		} catch (error) {
			console.error('Failed to update BareMux connection:', error);
			throw new Error(`BareMux connection failed: ${error.message}`);
		}
	}
}

/**
 * Sets the transport URL and updates BareMux.
 * @param {string} transport - Transport name or URL.
 * @returns {Promise<void>}
 */
export async function setTransport(transport) {
	console.log(`lethal.js: Setting transport to ${transport}`);
	transportURL = transportOptions[transport] || transport;
	await updateBareMux();
}

/**
 * Gets the current transport URL.
 * @returns {string | undefined}
 */
export function getTransport() {
	return transportURL;
}

/**
 * Sets the wisp URL and updates BareMux.
 * @param {string} wisp - Wisp URL.
 * @returns {Promise<void>}
 */
export async function setWisp(wisp) {
	console.log(`lethal.js: Setting Wisp to ${wisp}`);
	wispURL = wisp;
	await updateBareMux();
}

/**
 * Gets the current wisp URL.
 * @returns {string | undefined}
 */
export function getWisp() {
	return wispURL;
}


/**
 * Gets the proxied URL
 * @param {string} input - The input URL or hostname.
 * @returns {Promise<string>}
 * @throws {Error} If URL encoding fails.
 */
export async function getProxied(input) {
	try {
		const url = makeURL(input);
		if (!window.scramjet) {
			throw new Error('Scramjet not initialized yet. Please wait a moment and try again.');
		}
		return scramjet.encodeUrl(url);
	} catch (error) {
		console.error('Failed to get proxied URL:', error);
		throw error;
	}
}

/**
 * Sets the container element for frames.
 * @param {HTMLElement} frames - The frames container element.
 */
export function setFrames(frames) {
	framesElement = frames;
}

/**
 * Class representing a browser tab with its own iframe.
 */
export class Tab {
	/**
	 * Creates a new tab with an iframe and appends it to frames container.
	 */
	constructor() {
		tabCounter++;
		this.tabNumber = tabCounter;

		this.frame = document.createElement("iframe");
		this.frame.setAttribute("class", "w-full h-full border-0 fixed");
		this.frame.setAttribute("title", "Proxy Frame");
		this.frame.setAttribute("src", "/newtab");
		this.frame.setAttribute("loading", "lazy");
		this.frame.setAttribute("id", `frame-${tabCounter}`);
		framesElement.appendChild(this.frame);

		this.switch();

		this.frame.addEventListener("load", () => this.handleLoad());

		document.dispatchEvent(
			new CustomEvent("new-tab", {
				detail: { tabNumber: tabCounter },
			}),
		);
	}

	/**
	 * Switches to this tab, hiding other iframes and updating the address input.
	 */
	switch() {
		currentTab = this.tabNumber;
		const frames = document.querySelectorAll("iframe");
		[...frames].forEach((frame) => frame.classList.add("hidden"));
		this.frame.classList.remove("hidden");

		currentFrame = document.getElementById(`frame-${this.tabNumber}`);

		addressInput.value = decodeURIComponent(
			this.frame?.contentWindow?.location.href.split("/").pop()
		);

		document.dispatchEvent(
			new CustomEvent("switch-tab", {
				detail: { tabNumber: this.tabNumber },
			}),
		);
	}

	/**
	 * Closes this tab by removing its iframe and dispatching a close event.
	 */
	close() {
		this.frame.remove();

		document.dispatchEvent(
			new CustomEvent("close-tab", {
				detail: { tabNumber: this.tabNumber },
			}),
		);
	}

	/**
	 * Handles iframe load event: updates history and address input.
	 */
	handleLoad() {
		let url = decodeURIComponent(
			this.frame?.contentWindow?.location.href.split("/").pop()
		);
		let title = this.frame?.contentWindow?.document.title;

		let history = localStorage.getItem("history")
			? JSON.parse(localStorage.getItem("history"))
			: [];
		history = [...history, { url, title }];
		localStorage.setItem("history", JSON.stringify(history));

		document.dispatchEvent(
			new CustomEvent("url-changed", {
				detail: { tabId: currentTab, title, url },
			}),
		);

		if (url === "newtab") url = "bromine://newtab";
		addressInput.value = url;
	}
}

/**
 * Creates a new tab.
 * @returns {Promise<void>}
 */
export async function newTab() {
	new Tab();
}

/**
 * Switches to the specified tab number.
 * @param {number} tabNumber - Tab number to switch to.
 */
export function switchTab(tabNumber) {
	const frames = document.querySelectorAll("iframe");
	[...frames].forEach((frame) => {
		frame.classList.toggle("hidden", frame.id !== `frame-${tabNumber}`);
	});

	currentTab = tabNumber;
	currentFrame = document.getElementById(`frame-${tabNumber}`);

	addressInput.value = decodeURIComponent(
		currentFrame?.contentWindow?.location.href.split("/").pop()
	);

	document.dispatchEvent(
		new CustomEvent("switch-tab", {
			detail: { tabNumber },
		}),
	);
}

/**
 * Closes the tab with the specified tab number.
 * @param {number} tabNumber - Tab number to close.
 */
export function closeTab(tabNumber) {
	const frames = document.querySelectorAll("iframe");
	[...frames].forEach((frame) => {
		if (frame.id === `frame-${tabNumber}`) {
			frame.remove();
		}
	});

	if (currentTab === tabNumber) {
		const otherFrames = document.querySelectorAll('iframe[id^="frame-"]');
		if (otherFrames.length > 0) {
			switchTab(parseInt(otherFrames[0].id.replace("frame-", "")));
		} else {
			newTab();
		}
	}

	document.dispatchEvent(
		new CustomEvent("close-tab", {
			detail: { tabNumber },
		}),
	);
}
