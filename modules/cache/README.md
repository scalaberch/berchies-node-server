### how to use:

if you're not in `src/main.ts` and just accessing this somewhere, you can import the cache.
```
import { cache } from "@server/modules/cache"
```
then just call it:
```
const _cache = cache();
const isConnected = _cache.isConnected();
```

but if you're in main, you can access it directly from application parameter:
```
const _cache = application.modules.getModule('cache')
```

