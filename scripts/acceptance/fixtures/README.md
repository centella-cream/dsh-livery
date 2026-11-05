# Acceptance image fixtures

`picsum-wallpaper.jpg` is a real Picsum photo
([id 1015](https://picsum.photos/id/1015/1600/900)), downloaded once and committed
only so the deterministic acceptance browser can serve a realistic image through
the online-wallpaper redirect fixture. It is not a product asset, is not shipped
in the plugin tarball, and is not used as a built-in wallpaper. The test list
metadata is synthetic; the pixels and the redirect/revalidation path are what the
online-wallpaper checks exercise.
