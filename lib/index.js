import z from "@deepseek-ai/schemastery";
import { credentialRef } from "@deepseek-ai/dsh-credentials";
import { launchEnvironmentOf } from "@deepseek-ai/dsh-launch-environment";
import { WebError } from "@deepseek-ai/dsh-web";
//#region lib/provider.js
/**
 * Zhipu search through the dedicated Web Search tool API
 * (`POST {baseURL}/web_search`). One search is one plain HTTP call — no model
 * turn is spent, unlike the DeepSeek Messages adapter. The response's
 * structured `search_result` items become citeable sources; a response without
 * the field is an error rather than a prose-scraping fallback.
 * The wire format and native `fetch` client are provider-private and do not
 * use `ctx.llm`.
 * @module dsh-web-search-zhipu/provider
 */
/** Stable id this provider registers under. */
const ZHIPU_PROVIDER_ID = "zhipu-official";
/**
 * Default endpoint: Zhipu's open platform tool API base (`/web_search` is
 * appended). The same base serves the chat-completions API the pi-ai adapter
 * uses, but this provider deliberately reads its own config so search can be
 * pointed elsewhere without touching chat.
 */
const ZHIPU_DEFAULT_BASE_URL = "https://open.bigmodel.cn/api/paas/v4";
/** Default search engine (`search_std` is the cheapest general engine). */
const ZHIPU_DEFAULT_ENGINE = "search_std";
/** Default number of results requested per search. */
const ZHIPU_DEFAULT_COUNT = 10;
/** Default publish-time filter (`noLimit` = no recency constraint). */
const ZHIPU_DEFAULT_RECENCY = "noLimit";
/** Attribution header sent on every request. */
const USER_AGENT = "deepseek-harness-web-search-zhipu/0.1.0";
/**
 * Map a Zhipu Web Search API response to a normalized search result. Items are
 * deduplicated by URL; `content` becomes the snippet and `publish_date` the
 * `publishedAt`. The web service owns the final `maxResults` truncation, so
 * `truncated` is always `false` here.
 *
 * @param response - the parsed tool-API response body.
 * @returns the normalized result with deduped sources.
 * @throws {@link WebError} when the response carries no `search_result` array.
 */
function mapZhipuResponse(response) {
	const items = response.search_result;
	if (!Array.isArray(items)) throw new WebError("Zhipu returned no search_result array; the response may not be from the Web Search tool API", "WEB_PROVIDER_ERROR");
	const seen = /* @__PURE__ */ new Set();
	const sources = [];
	for (const item of items) {
		const url = typeof item?.link === "string" ? item.link : "";
		if (url.length === 0 || seen.has(url)) continue;
		seen.add(url);
		const title = typeof item.title === "string" ? item.title : "";
		const content = typeof item.content === "string" ? item.content : "";
		const publishedAt = typeof item.publish_date === "string" ? item.publish_date : "";
		sources.push({
			url,
			...title.length > 0 ? { title } : {},
			...content.length > 0 ? { snippet: content } : {},
			...publishedAt.length > 0 ? { publishedAt } : {}
		});
	}
	return {
		sources,
		truncated: false
	};
}
/**
 * The Zhipu-backed search provider. HTTP redirects fail as `WEB_PROVIDER_ERROR`;
 * failures after dispatch name the endpoint and tell the model how the user can
 * configure it.
 */
var ZhipuSearchProvider = class {
	resolveOptions;
	id = ZHIPU_PROVIDER_ID;
	/**
	 * @param resolveOptions - the options for the NEXT operation, snapshotted
	 * once at each operation's entry so one search never mixes two sections. A
	 * thunk rather than a value because the plugin's settings section can change
	 * between searches, and re-registering the provider to carry a new endpoint
	 * would make the seam's selection observable to the user as a flicker.
	 */
	constructor(resolveOptions) {
		this.resolveOptions = resolveOptions;
	}
	available() {
		const options = this.resolveOptions();
		return ((options.apiKey?.length ?? 0) > 0 || options.resolveApiKey !== void 0) && URL.canParse(options.baseURL) && isPositiveInteger(options.count);
	}
	async search(request, signal) {
		const options = this.resolveOptions();
		const apiKey = await this.apiKey(options, signal);
		throwIfSearchAborted(signal);
		const endpoint = `${options.baseURL}/web_search`;
		const body = {
			search_query: request.query,
			search_engine: options.searchEngine,
			count: options.count,
			search_recency_filter: options.recency
		};
		options.recordRequest?.({ endpoint, body });
		throwIfSearchAborted(signal);
		let response;
		try {
			response = await fetch(endpoint, {
				method: "POST",
				redirect: "error",
				headers: {
					"authorization": `Bearer ${apiKey}`,
					"content-type": "application/json",
					"accept": "application/json",
					"user-agent": USER_AGENT
				},
				body: JSON.stringify(body),
				...signal !== void 0 ? { signal } : {}
			});
		} catch (error) {
			if (signal?.aborted === true || isAbortError(error)) throw searchAborted(signal, error);
			throw searchEndpointError(endpoint, `Zhipu search request failed: ${String(error)}`, error);
		}
		if (!response.ok) {
			let message = `Zhipu API error (HTTP ${response.status})`;
			try {
				const parsed = await response.json();
				const detail = typeof parsed.error === "string" ? parsed.error : parsed.error?.message ?? parsed.message;
				if (detail !== void 0 && detail.length > 0) message += `: ${detail}`;
			} catch (error) {
				if (signal?.aborted === true || isAbortError(error)) throw searchAborted(signal, error);
			}
			throw searchEndpointError(endpoint, message);
		}
		try {
			return mapZhipuResponse(await response.json());
		} catch (error) {
			if (signal?.aborted === true || isAbortError(error)) throw searchAborted(signal, error);
			throw searchEndpointError(endpoint, error instanceof WebError ? error.message : `Zhipu returned an unprocessable response body: ${String(error)}`, error);
		}
	}
	/**
	 * Resolve one operation's credential without retaining it on the provider.
	 * @param options - the caller's snapshot, so the key and the endpoint it is sent to come from one section.
	 * @param signal - abort signal for the surrounding search.
	 * @returns the resolved key.
	 */
	async apiKey(options, signal) {
		throwIfSearchAborted(signal);
		if (options.apiKey !== void 0 && options.apiKey.length > 0) return options.apiKey;
		let resolved;
		try {
			resolved = await abortable(options.resolveApiKey?.() ?? Promise.resolve(void 0), signal);
		} catch (error) {
			if (signal?.aborted === true || isAbortError(error)) throw searchAborted(signal, error);
			throw new WebError(`Zhipu search credential resolution failed: ${String(error)}`, "WEB_PROVIDER_ERROR", { cause: error });
		}
		if (resolved !== void 0 && resolved.length > 0) return resolved;
		throw new WebError(`Zhipu search has no API key for "${options.apiKeyEnv ?? "OPEN_BIGMODEL_CN_API_KEY"}"; store it through the credentials service (the web Models page writes it), export it in the launching environment, or set a literal "apiKey" in the web-search-zhipu config`, "WEB_PROVIDER_CREDENTIAL_MISSING");
	}
};
/** Add endpoint recovery instructions to failures that occur after request dispatch begins. */
function searchEndpointError(endpoint, message, cause) {
	return new WebError(`${message}\n\nThe web search request used endpoint ${JSON.stringify(endpoint)}. Search endpoint configuration is separate from chat. If that endpoint is not intended, guide the user to Settings > Plugins > Plugin configuration > Web search (zhipu), where they can change and save Endpoint. If that settings page is unavailable, the user can set ZHIPU_SEARCH_BASE_URL or configure web-search-zhipu.baseURL in the profile patch. Only the user should choose or change the endpoint.`, "WEB_PROVIDER_ERROR", cause === void 0 ? void 0 : { cause });
}
/**
 * Race a same-process asynchronous preflight against caller cancellation. The
 * attached settlement handlers keep observing an uncooperative operation after
 * abort so a later rejection cannot become unhandled.
 */
function abortable(operation, signal) {
	if (signal === void 0) return operation;
	if (signal.aborted) return Promise.reject(searchAborted(signal));
	return new Promise((resolve, reject) => {
		const onAbort = () => {
			reject(searchAborted(signal));
		};
		signal.addEventListener("abort", onAbort, { once: true });
		operation.then((value) => {
			signal.removeEventListener("abort", onAbort);
			resolve(value);
		}, (error) => {
			signal.removeEventListener("abort", onAbort);
			reject(new Error(String(error).replace(/^Error: /u, ""), { cause: error }));
		});
	});
}
/** Throw the provider's stable cancellation error when the caller already aborted. */
function throwIfSearchAborted(signal) {
	if (signal?.aborted === true) throw searchAborted(signal);
}
/** Build the provider's stable cancellation error while retaining the caller's reason. */
function searchAborted(signal, fallback) {
	return new WebError("Zhipu search aborted", "WEB_ABORTED", { cause: signal?.aborted === true ? signal.reason : fallback });
}
/** True for a fetch/`AbortSignal` abort, surfaced as `WEB_ABORTED`. */
function isAbortError(error) {
	return error instanceof DOMException && error.name === "AbortError";
}
/** True for a requestable result count. */
function isPositiveInteger(value) {
	return Number.isInteger(value) && value > 0;
}
//#endregion
//#region lib/index.js
/**
 * Register a Zhipu-backed provider in `ctx.web`. It calls the Web Search tool
 * API (`POST {baseURL}/web_search`) directly — one plain HTTP call per search,
 * no model turn. The provider reuses the `OPEN_BIGMODEL_CN_API_KEY` credential
 * reference the Models page already manages.
 * @module dsh-web-search-zhipu
 */
/** Cordis plugin name used by loader diagnostics. */
const name = "web-search-zhipu";
/** The web seam this provider registers into. */
const inject = ["web"];
const DEFAULT_API_KEY_ENV = "OPEN_BIGMODEL_CN_API_KEY";
const Config = z.object({
	apiKey: z.string().role("secret"),
	apiKeyEnv: z.string().role("credential-ref").default(DEFAULT_API_KEY_ENV),
	baseURL: z.string(),
	searchEngine: z.string().default(ZHIPU_DEFAULT_ENGINE),
	count: z.number().step(1).min(1).default(ZHIPU_DEFAULT_COUNT),
	recency: z.string().default(ZHIPU_DEFAULT_RECENCY)
});
/**
 * Environment variable naming this provider's endpoint. Deliberately distinct
 * from `$DEEPSEEK_SEARCH_BASE_URL`: the Zhipu search endpoint speaks a
 * different protocol on a different vendor.
 */
const SEARCH_BASE_URL_ENV = "ZHIPU_SEARCH_BASE_URL";
/** Settings namespace carrying this provider's endpoint, engine, and key reference. */
const WEB_SEARCH_ZHIPU_SETTINGS_NAMESPACE = "web-search-zhipu";
/**
 * Project one resolved section into the options the provider serves its next
 * search with. Environment fallbacks stay here rather than in the provider:
 * every value it reads is already fully defaulted.
 * @param ctx - plugin context supplying the credential and environment planes.
 * @param config - the currently authoritative section.
 * @returns options for one search.
 */
function resolveOptions(ctx, config) {
	const apiKeyEnv = credentialRef(config.apiKeyEnv ?? DEFAULT_API_KEY_ENV);
	const literalApiKey = config.apiKey !== void 0 && config.apiKey.length > 0 ? config.apiKey : void 0;
	return {
		...literalApiKey === void 0 ? {} : { apiKey: literalApiKey },
		resolveApiKey: async () => {
			const credentials = ctx.get("credentials");
			if (credentials !== void 0) return (await credentials.resolve(apiKeyEnv))?.value;
			const ambient = launchEnvironmentOf(ctx).get(apiKeyEnv);
			return ambient !== void 0 && ambient.value.length > 0 ? ambient.value : void 0;
		},
		apiKeyEnv,
		baseURL: config.baseURL ?? launchEnvironmentOf(ctx).get(SEARCH_BASE_URL_ENV)?.value ?? ZHIPU_DEFAULT_BASE_URL,
		searchEngine: config.searchEngine ?? ZHIPU_DEFAULT_ENGINE,
		count: config.count ?? ZHIPU_DEFAULT_COUNT,
		recency: config.recency ?? ZHIPU_DEFAULT_RECENCY,
		recordRequest: (request) => {
			ctx.get("agents")?.currentInitiator()?.session.append("web/zhipu-search-request", request);
		}
	};
}
/** Register the Zhipu search provider with `ctx.web`. */
function apply(ctx, config) {
	let current = () => config;
	ctx.inject(["settings"], (settingsCtx) => {
		settingsCtx.settings.installSection(ctx, WEB_SEARCH_ZHIPU_SETTINGS_NAMESPACE, Config, config, {
			setSource: (source) => {
				current = source;
			},
			onChange: () => {}
		});
	});
	ctx.web.registerSearchProvider(new ZhipuSearchProvider(() => resolveOptions(ctx, current())));
}
//#endregion
export { Config, DEFAULT_API_KEY_ENV, SEARCH_BASE_URL_ENV, WEB_SEARCH_ZHIPU_SETTINGS_NAMESPACE, ZHIPU_DEFAULT_BASE_URL, ZHIPU_DEFAULT_COUNT, ZHIPU_DEFAULT_ENGINE, ZHIPU_DEFAULT_RECENCY, ZHIPU_PROVIDER_ID, ZhipuSearchProvider, apply, inject, name };