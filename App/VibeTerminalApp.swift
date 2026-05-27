import SwiftUI

@main
struct VibeTerminalApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    
    var body: some Scene {
        WindowGroup {
            MainWindowView()
                .frame(minWidth: 600, minHeight: 400)
        }
        .windowStyle(.hiddenTitleBar)
        .commands {
            CommandGroup(replacing: .newItem) {
                Button("New Tab") {
                    NotificationCenter.default.post(name: .newTab, object: nil)
                }
                .keyboardShortcut("t", modifiers: .command)
                
                Button("New Window") {
                    NotificationCenter.default.post(name: .newWindow, object: nil)
                }
                .keyboardShortcut("n", modifiers: .command)
                
                Divider()
                
                Button("Split Horizontally") {
                    NotificationCenter.default.post(name: .splitHorizontal, object: nil)
                }
                .keyboardShortcut("d", modifiers: .command)
                
                Button("Split Vertically") {
                    NotificationCenter.default.post(name: .splitVertical, object: nil)
                }
                .keyboardShortcut("d", modifiers: [.command, .shift])
            }
            
            CommandGroup(after: .textEditing) {
                Divider()
                
                Button("Clear Terminal") {
                    NotificationCenter.default.post(name: .clearTerminal, object: nil)
                }
                .keyboardShortcut("k", modifiers: .command)
                
                Button("Search...") {
                    NotificationCenter.default.post(name: .showSearch, object: nil)
                }
                .keyboardShortcut("f", modifiers: .command)
                
                Button("Command Palette") {
                    NotificationCenter.default.post(name: .showCommandPalette, object: nil)
                }
                .keyboardShortcut("p", modifiers: [.command, .shift])
            }
            
            CommandMenu("View") {
                Button("Next Tab") {
                    NotificationCenter.default.post(name: .nextTab, object: nil)
                }
                .keyboardShortcut("]", modifiers: [.command, .shift])

                Button("Previous Tab") {
                    NotificationCenter.default.post(name: .previousTab, object: nil)
                }
                .keyboardShortcut("[", modifiers: [.command, .shift])

                Divider()

                Button("Close Tab") {
                    NotificationCenter.default.post(name: .closeTab, object: nil)
                }
                .keyboardShortcut("w", modifiers: .command)
            }
        }
        
        Settings {
            SettingsView()
        }
    }
}

extension Notification.Name {
    static let newTab = Notification.Name("newTab")
    static let newWindow = Notification.Name("newWindow")
    static let splitHorizontal = Notification.Name("splitHorizontal")
    static let splitVertical = Notification.Name("splitVertical")
    static let clearTerminal = Notification.Name("clearTerminal")
    static let showSearch = Notification.Name("showSearch")
    static let showCommandPalette = Notification.Name("showCommandPalette")
    static let nextTab = Notification.Name("nextTab")
    static let previousTab = Notification.Name("previousTab")
    static let closeTab = Notification.Name("closeTab")
    static let terminalTitleChange = Notification.Name("terminalTitleChange")
}