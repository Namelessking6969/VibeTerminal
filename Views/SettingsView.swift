import SwiftUI

struct SettingsView: View {
    @ObservedObject var settings = Settings.shared
    
    var body: some View {
        TabView {
            GeneralSettingsView()
                .tabItem {
                    Label("General", systemImage: "gear")
                }
            
            AppearanceSettingsView()
                .tabItem {
                    Label("Appearance", systemImage: "paintbrush")
                }
            
            TerminalSettingsView()
                .tabItem {
                    Label("Terminal", systemImage: "terminal")
                }
        }
        .frame(width: 450, height: 300)
    }
}

struct GeneralSettingsView: View {
    @ObservedObject var settings = Settings.shared
    
    var body: some View {
        Form {
            Section("Startup") {
                Toggle("Open new window with a single tab", isOn: .constant(true))
                Toggle("Restore previously open tabs", isOn: .constant(true))
            }
            
            Section("Closing") {
                Toggle("Confirm before closing terminal with running processes", isOn: .constant(false))
            }
        }
        .padding()
    }
}

struct AppearanceSettingsView: View {
    @ObservedObject var settings = Settings.shared
    
    var body: some View {
        Form {
            Section("Theme") {
                Picker("Color Scheme", selection: $settings.theme) {
                    ForEach(TerminalTheme.allThemes) { theme in
                        HStack {
                            Circle()
                                .fill(Color(hex: theme.background))
                                .frame(width: 16, height: 16)
                                .overlay(
                                    Circle()
                                        .stroke(Color(hex: theme.cursor), lineWidth: 1)
                                )
                            Text(theme.name)
                        }
                        .tag(theme)
                    }
                }
                .pickerStyle(.menu)
            }
            
            Section("Font") {
                HStack {
                    Text("Size:")
                    Slider(value: $settings.fontSize, in: 10...24, step: 1)
                    Text("\(Int(settings.fontSize))pt")
                        .frame(width: 40)
                }
            }
            
            Section("Cursor") {
                Picker("Style", selection: $settings.cursorStyle) {
                    ForEach(TerminalProfile.CursorStyle.allCases, id: \.self) { style in
                        Text(style.rawValue.capitalized).tag(style)
                    }
                }
                .pickerStyle(.segmented)
                
                Toggle("Blinking cursor", isOn: $settings.cursorBlink)
            }
        }
        .padding()
    }
}

struct TerminalSettingsView: View {
    @ObservedObject var settings = Settings.shared
    
    var body: some View {
        Form {
            Section("Scrollback") {
                Stepper("Lines: \(settings.scrollbackLines)", value: $settings.scrollbackLines, in: 1000...100000, step: 1000)
            }
            
            Section("Bell") {
                Toggle("Audible bell", isOn: $settings.bellEnabled)
                Toggle("Visual bell", isOn: .constant(true))
            }
            
            Section("Shell") {
                Picker("Default shell", selection: .constant("/bin/zsh")) {
                    Text("zsh").tag("/bin/zsh")
                    Text("bash").tag("/bin/bash")
                    Text("fish").tag("/usr/local/bin/fish")
                }
                .pickerStyle(.menu)
            }
        }
        .padding()
    }
}