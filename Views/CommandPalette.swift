import SwiftUI

struct CommandPaletteView: View {
    @Binding var isPresented: Bool
    @ObservedObject var terminalManager: TerminalManager
    @State private var searchText = ""
    @State private var selectedIndex = 0
    
    private let commands: [CommandItem] = [
        CommandItem(id: "newTab", title: "New Tab", shortcut: "⌘T", action: { terminalManager.addTab() }),
        CommandItem(id: "closeTab", title: "Close Tab", shortcut: "⌘W", action: { terminalManager.closeActiveTab() }),
        CommandItem(id: "splitH", title: "Split Horizontally", shortcut: "⌘D", action: { terminalManager.splitActivePane(direction: .horizontal) }),
        CommandItem(id: "splitV", title: "Split Vertically", shortcut: "⌘⇧D", action: { terminalManager.splitActivePane(direction: .vertical) }),
        CommandItem(id: "nextTab", title: "Next Tab", shortcut: "⌘⇧]", action: { terminalManager.nextTab() }),
        CommandItem(id: "prevTab", title: "Previous Tab", shortcut: "⌘⇧[", action: { terminalManager.previousTab() }),
        CommandItem(id: "clear", title: "Clear Terminal", shortcut: "⌘K", action: { terminalManager.activeSession?.buffer.clear() }),
        CommandItem(id: "search", title: "Search...", shortcut: "⌘F", action: { }),
        CommandItem(id: "settings", title: "Open Settings", shortcut: "⌘,", action: { NSApp.sendAction(Selector(("showSettingsWindow:")), to: nil, from: nil) }),
    ]
    
    var filteredCommands: [CommandItem] {
        if searchText.isEmpty { return commands }
        return commands.filter { $0.title.localizedCaseInsensitiveContains(searchText) }
    }
    
    var body: some View {
        ZStack {
            Color.black.opacity(0.5)
                .ignoresSafeArea()
                .onTapGesture {
                    isPresented = false
                }
            
            VStack(spacing: 0) {
                VStack(spacing: 0) {
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(Color(hex: Settings.shared.theme.foreground).opacity(0.5))
                        
                        TextField("Type a command...", text: $searchText)
                            .textFieldStyle(.plain)
                            .font(.system(size: 14))
                            .foregroundColor(Color(hex: Settings.shared.theme.foreground))
                    }
                    .padding(12)
                }
                .background(Color(hex: Settings.shared.theme.black))
                
                Divider()
                    .background(Color(hex: Settings.shared.theme.foreground).opacity(0.2))
                
                ScrollViewReader { proxy in
                    VStack(spacing: 0) {
                        ForEach(Array(filteredCommands.enumerated()), id: \.element.id) { index, command in
                            CommandRowView(
                                command: command,
                                isSelected: index == selectedIndex
                            )
                            .id(index)
                            .onTapGesture {
                                command.action()
                                isPresented = false
                            }
                        }
                    }
                    .onChange(of: selectedIndex) { _, newIndex in
                        withAnimation {
                            proxy.scrollTo(newIndex, anchor: .center)
                        }
                    }
                }
                .frame(maxHeight: 300)
                .background(Color(hex: Settings.shared.theme.background))
            }
            .frame(width: 400)
            .cornerRadius(8)
            .shadow(color: .black.opacity(0.5), radius: 20)
        }
        .onKeyPress(.escape) {
            isPresented = false
            return .handled
        }
        .onKeyPress(.upArrow) {
            selectedIndex = max(0, selectedIndex - 1)
            return .handled
        }
        .onKeyPress(.downArrow) {
            selectedIndex = min(filteredCommands.count - 1, selectedIndex + 1)
            return .handled
        }
        .onKeyPress(.return) {
            if selectedIndex < filteredCommands.count {
                filteredCommands[selectedIndex].action()
                isPresented = false
            }
            return .handled
        }
    }
}

struct CommandItem: Identifiable {
    let id: String
    let title: String
    let shortcut: String
    let action: () -> Void
}

struct CommandRowView: View {
    let command: CommandItem
    let isSelected: Bool
    
    var body: some View {
        HStack {
            Text(command.title)
                .font(.system(size: 13))
                .foregroundColor(Color(hex: Settings.shared.theme.foreground))
            
            Spacer()
            
            Text(command.shortcut)
                .font(.system(size: 11, design: .monospaced))
                .foregroundColor(Color(hex: Settings.shared.theme.foreground).opacity(0.5))
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color(hex: Settings.shared.theme.black).opacity(0.5))
                .cornerRadius(4)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(isSelected ? Color(hex: Settings.shared.theme.selection) : Color.clear)
    }
}