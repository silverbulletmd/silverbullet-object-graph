#meta

This page holds configuration for your SilverBullet space. See [[^Library/Std/Config]] for all options and defaults.

Run ${widgets.commandButton "System: Reload"} to reload.

## User configuration
Anything you add to the block below is yours, edit freely.

```space-lua
tag.define {
  name = "driver",
  transform = function(o)
    o.pageDecoration = { prefix = "🏎️ " }
    return o
  end
}

tag.define {
  name = "team",
  transform = function(o)
    o.pageDecoration = { prefix = "👥 " }
    return o
  end
}

tag.define {
  name = "season",
  transform = function(o)
    o.pageDecoration = { prefix = "🗓️ " }
    return o
  end
}

tag.define {
  name = "circuit",
  transform = function(o)
    o.pageDecoration = { prefix = "🛣️ " }
    return o
  end
}

tag.define {
  name = "engine",
  transform = function(o)
    o.pageDecoration = { prefix = "⚙️ " }
    return o
  end
}

tag.define {
  name = "principal",
  transform = function(o)
    o.pageDecoration = { prefix = "🎩 " }
    return o
  end
}

tag.define {
  name = "engineer",
  transform = function(o)
    o.pageDecoration = { prefix = "🧑‍🔧 " }
    return o
  end
}
```

## Managed by the Configuration Manager
The block below is maintained by the ${widgets.commandButton("Configuration Manager", "Configuration: Open")}. Prefer editing it through the UI, although simple hand edits should survive.
