# dsh-web-search-zhipu

Zhipu Web Search API search provider for the DeepSeek Harness web seam (ctx.web).

## Description

This plugin provides a web search provider for DeepSeek Harness that uses Zhipu AI's Web Search API. It allows the system to perform web searches using Zhipu's search capabilities.

## Features

- Direct integration with Zhipu Web Search API
- Configurable search engine, result count, and recency filters
- Secure API key management through DeepSeek credentials service
- Proper error handling and abort support

## Installation

```bash
npm install @deepseek-ai/dsh-web-search-zhipu
```

## Usage

```javascript
import { apply } from '@deepseek-ai/dsh-web-search-zhipu';

// Register the provider
apply(ctx, {
  apiKey: 'your-zhipu-api-key',
  baseURL: 'https://open.bigmodel.cn/api/paas/v4'
});
```

## Configuration

The plugin supports the following configuration options:

- `apiKey`: Your Zhipu API key (string)
- `apiKeyEnv`: Environment variable name for API key (string, default: "OPEN_BIGMODEL_CN_API_KEY")
- `baseURL`: Zhipu API base URL (string, default: "https://open.bigmodel.cn/api/paas/v4")
- `searchEngine`: Search engine type (string, default: "search_std")
- `count`: Number of results (number, default: 10)
- `recency`: Recency filter (string, default: "noLimit")

## API Key Setup

You can set up your Zhipu API key in several ways:

1. **Directly in config:**
   ```javascript
   apply(ctx, {
     apiKey: 'your-api-key-here'
   });
   ```

2. **Through environment variable:**
   ```javascript
   apply(ctx, {
     apiKeyEnv: 'ZHIPU_API_KEY'
   });
   ```

3. **Through DeepSeek credentials service:**
   ```javascript
   apply(ctx, {
     apiKeyEnv: 'OPEN_BIGMODEL_CN_API_KEY'
   });
   ```

## Search Engines

Available search engines:
- `search_std`: Standard search engine (default)
- `search_news`: News search
- `search_academic`: Academic search
- `search_webpage`: Webpage search

## Examples

### Basic Usage

```javascript
import { apply } from '@deepseek-ai/dsh-web-search-zhipu';

apply(ctx, {
  apiKey: 'your-api-key',
  searchEngine: 'search_std',
  count: 10,
  recency: 'noLimit'
});
```

### Advanced Configuration

```javascript
import { apply } from '@deepseek-ai/dsh-web-search-zhipu';

apply(ctx, {
  apiKey: 'your-api-key',
  baseURL: 'https://open.bigmodel.cn/api/paas/v4',
  searchEngine: 'search_news',
  count: 20,
  recency: 'lastMonth'
});
```

## License

MIT License

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions, please open an issue on the GitHub repository.