[![dependencies][dependencies-image]][dependencies-url] [![dev dependencies][dev-dependencies-image]][dev-dependencies-url]

# brackets-launcher

A Brackets extension to execute system command from Brackets, through menu and/or toolbar icons.

# Table of Contents

* [Install](#install)
* [Usage](#usage)
    * [Menus items](#menus-items)
        * [Divider](#divider)
        * [Item](#item)
            * [Opts](#opts)
    * [Internal parameters](#internal-parameters)
* [Inspired by](#inspired-by)
* [License](#license)

# Install

Use the extension manager (File > Extension Manager) and search for `brackets-launcher`.
There you can install `brackets-launcher`.

*From GitHub (newest version):*
`File` > `Extension Manager` > `Install from URL` > `http://github.com/guitarneck/brackets-launcher` > `Install`

# Usage

Create a `launcher-config.json` file into your project workspace.

```
{
    "gulp":true,
    "nmp":true,
    
    "colors":["#efefef","black"],
    
    "link":
    {
        "href": "https://use.fontawesome.com/releases/v5.3.1/css/all.css",
        "integrity": "sha384-mzrmE5qonljUremFsqc01SB46JvROS7bZs3IO2EmfFsd15uHvIt+Y8vEf7N7fWAU",
        "crossorigin": "anonymous"
    },
    
    "icons":
    {
        "style":"text-align:center;line-height: 1.8em;color:yellow"
    },
    
    "menus": [
    {
        "label": "Git status",
        "cmd": "git status",
        "args" : []
        "icon": {
            "class":"fas fa-file-medical-alt"
        }
    },{
        "divider":true
    },{
        ...
    }]
}
```

| Name | Type | Description |
|:-|:-:|:-|
| gulp | `boolean` | _`false` if you don't need gulp tasks to be launched._ |
| npm | `boolean`| _`false` if you don't need scripts to be launched._ |
| colors | `array`| _CSS colours values for background and fareground colors of the brackets terminal._ |
| link | `hashes`| _Add some `<link>` attributes for a css file. ex: fontawesome._ |
| icons | `hashes`| _Some global attributes for the toolbar icons._ |
| menus | `array` | _The menu items of your system commands._ |

## Menus items

An item can be a `divider` or a `menu item` :

### Divider

| Name | Type | Description |
|:-|:-:|:-|
| divider | `boolean` | _This is a divider. To separates some menu items._ |

### Item

| Name | Type | Description |
|:-|:-:|:-|
| label | `string` | _Label that show in menus._ |
|cmd | `string` | _Command to execute. Use `$0, $1, ... $n` to specify custom arguments, that will be prompted for user._ |
| args | `array` | _The default arguments, in case user supply nothing._ |
| splitChar | `char` | _Specify the char that will separate arguments of command. Default value is `':'`._ |
| opts | `hashes` | _Optional attributes that configure some options of execution environment._ |

#### Opts

| Name | Type | Description |
|:-|:-:|:-|
| defaultPath | `string` | _Directory path where command will executed. Default is directory of a selected file, directory of the project otherwise._ |
| hiddenConsole | `boolean` | _`True` indicates to not open the output panel during command execution._ |
| killCmd | `boolean` | _Command that will be triggered by 'Kill Commands' menu option._ |

## Internal parameters

This internal parameters can be used in the `cmd`, in the `args` or in the `opts.defautPath`.

* __$selectedFile__
    
    _The selected file's name._

* __$dirOfSelectedFile__
    
    _The directory of the selected file._

* __$projectDir__
    
    _The project directory._

* __$projectName__
    
    _Tne project name._

# Inspired by

[brackets-nodejs][brackets-nodejs-github]

[brackets-command-runner][brackets-command-runner-github]


# License

[MIT © guitarneck](./LICENSE)

[brackets-nodejs-github]: https://github.com/Acconut/brackets-nodejs
[brackets-command-runner-github]: https://github.com/tarcisiojr/brackets-command-runner

[dev-dependencies-image]: https://david-dm.org/guitarneck/brackets-launcher/dev-status.svg
[dev-dependencies-url]: https://david-dm.org/guitarneck/brackets-launcher?type=dev
[dependencies-image]: https://david-dm.org/guitarneck/brackets-launcher/status.svg
[dependencies-url]: https://david-dm.org/guitarneck/brackets-launcher