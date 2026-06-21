## Project Dependencies

### Main Requirements

- **npm**: To manage frontend dependencies.
- **Gradle 9.5.1**: To build and manage the Kotlin backend.
- **JDK 21 / JRE 21**: Java Development Kit version 21, required to compile and run the backend.


### Installing Node.js and npm with nvm

It is recommended to use `nvm` (Node Version Manager) to install Node.js and npm. This allows you to easily manage multiple versions of Node.js.

```bash
# Download and install nvm:
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash

# in lieu of restarting the shell
\. "$HOME/.nvm/nvm.sh"

# Download and install Node.js:
nvm install 24

# Verify the Node.js version:
node -v # Should print "v24.16.0".
nvm current # Should print "v24.16.0".

# Verify npm version:
npm -v # Should print "11.13.0".
```

### Installing JDK with SDKMAN!
> [!NOTE]
> To install the Java Development Kit (JDK), we recommend using [SDKMAN!](https://sdkman.io/), a tool for managing multiple versions of Software Development Kits.

```bash
# Instalar SDKMAN!
curl -s "https://get.sdkman.io" | bash

# Cargar SDKMAN! en la sesión actual y agregarlo a tu shell
source "$HOME/.sdkman/bin/sdkman-init.sh"
 
# Instalar Java 21
sdk install java 21.0.8-tem
 ```
 **Note:** Remember to add `source "$HOME/.sdkman/bin/sdkman-init.sh"` to your `~/.bashrc` or `~/.zshrc` file so that `sdk` is available in all future terminal sessions.