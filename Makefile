all: install

.PHONY: install

install:
	echo "installing..."
	rm -rf ~/.local/share/gnome-shell/extensions/gdock@icedman.github.com/
	mkdir -p ~/.local/share/gnome-shell/extensions/gdock@icedman.github.com/
	cp -R ./* ~/.local/share/gnome-shell/extensions/gdock@icedman.github.com/

test-shell: install
	env GNOME_SHELL_SLOWDOWN_FACTOR=2 \
		MUTTER_DEBUG_DUMMY_MODE_SPECS=1400x800 \
	 	MUTTER_DEBUG_DUMMY_MONITOR_SCALES=2 \
		dbus-run-session -- gnome-shell --nested --wayland
	rm /run/user/1000/gnome-shell-disable-extensions

clean:
	rm -rf ./build
	
pretty:
	prettier --single-quote --write "**/*.js"
