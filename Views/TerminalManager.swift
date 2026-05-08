import SwiftUI
import AppKit

class TerminalManager: ObservableObject {
    @Published var tabs: [TerminalTab] = []
    @Published var activeTabIndex: Int = 0
    
    var activeTab: TerminalTab? {
        guard activeTabIndex >= 0 && activeTabIndex < tabs.count else { return nil }
        return tabs[activeTabIndex]
    }
    
    var activeSession: TerminalSession? {
        return activeTab?.activeSession
    }
    
    init() {
        addTab()
    }
    
    func addTab() {
        let session = TerminalSession(name: "zsh", columns: 80, rows: 24)
        let tab = TerminalTab(title: "zsh", session: session)
        tabs.append(tab)
        activeTabIndex = tabs.count - 1
        
        session.onTitleChange = { [weak self, weak tab] title in
            tab?.title = title
            self?.objectWillChange.send()
        }
        
        session.onClose = { [weak self, weak tab] in
            if let tab = tab, let index = self?.tabs.firstIndex(where: { $0.id == tab.id }) {
                self?.closeTab(at: index)
            }
        }
    }
    
    func closeTab(at index: Int) {
        guard tabs.count > 1 else {
            tabs[0].session.close()
            addTab()
            return
        }
        
        tabs[index].session.close()
        tabs.remove(at: index)
        
        if activeTabIndex >= tabs.count {
            activeTabIndex = tabs.count - 1
        }
    }
    
    func closeActiveTab() {
        closeTab(at: activeTabIndex)
    }
    
    func nextTab() {
        activeTabIndex = (activeTabIndex + 1) % tabs.count
    }
    
    func previousTab() {
        activeTabIndex = (activeTabIndex - 1 + tabs.count) % tabs.count
    }
    
    func splitActivePane(direction: SplitDirection) {
        activeTab?.split(direction: direction)
    }
}

struct TerminalTab: Identifiable {
    let id = UUID()
    @Published var title: String
    let session: TerminalSession
    @Published var splitSessions: [TerminalSession] = []
    @Published var splitLayout: [SplitDirection] = []
    @Published var activeSplitIndex: Int = 0
    
    var activeSession: TerminalSession {
        if activeSplitIndex < splitSessions.count && splitSessions.count > 0 {
            return splitSessions[activeSplitIndex]
        }
        return session
    }
    
    init(title: String, session: TerminalSession) {
        self.title = title
        self.session = session
    }
    
    func split(direction: SplitDirection) {
        let newSession = TerminalSession(name: "zsh", columns: 80, rows: 24)
        splitSessions.append(newSession)
        splitLayout.append(direction)
    }
}

enum SplitDirection {
    case horizontal
    case vertical
}