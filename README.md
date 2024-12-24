# Lyri

[![GitHub license](https://img.shields.io/github/license/Zedeldi/lyri?style=flat-square)](https://github.com/Zedeldi/lyri/blob/master/LICENSE) [![GitHub last commit](https://img.shields.io/github/last-commit/Zedeldi/lyri?style=flat-square)](https://github.com/Zedeldi/lyri/commits) [![Code style: black](https://img.shields.io/badge/code%20style-black-000000.svg?style=flat-square)](https://github.com/psf/black)

HTTP music dashboard to control playback via playerctl and display lyrics.

## Description

Provides a [Sanic](https://pypi.org/project/sanic/) web application and helper class to manage playback via [playerctl](https://github.com/altdesktop/playerctl).

The web application is hosted using Sanic, which provides endpoints to query player information
from playerctl via [PyGObject](https://pypi.org/project/PyGObject/) bindings.
Lyrics are fetched using [syncedlyrics](https://pypi.org/project/syncedlyrics/).

Player information is pushed to the client over a [WebSocket](https://en.wikipedia.org/wiki/WebSocket).

No external JavaScript libraries are requried.

## Installation

After cloning the repository with: `git clone https://github.com/Zedeldi/lyri.git`

### Build

1. Install project: `pip install .`
2. Run: `lyri` or `sanic lyri.server -H <host> -p <port>`

### Development

1. Install dependencies: `pip install -r requirements.txt`
2. Run: `python -m lyri` or `sanic lyri.server --dev -H <host> -p <port>`

#### Libraries:

-   [PyGObject](https://pypi.org/project/PyGObject/) - GObject bindings
-   [Sanic](https://pypi.org/project/sanic/) - web framework and server
-   [syncedlyrics](https://pypi.org/project/syncedlyrics/) - lyrics fetcher

## Credits

-   [Bootstrap Icons](https://icons.getbootstrap.com/) - icons
-   [Google Fonts](https://fonts.google.com/) - fonts

## License

`lyri` is licensed under the [MIT Licence](https://mit-license.org/) for everyone to use, modify and share freely.

This project is distributed in the hope that it will be useful, but without any warranty.

## Donate

If you found this project useful, please consider donating. Any amount is greatly appreciated! Thank you :smiley:

[![PayPal](https://www.paypalobjects.com/webstatic/mktg/Logo/pp-logo-150px.png)](https://paypal.me/ZackDidcott)
