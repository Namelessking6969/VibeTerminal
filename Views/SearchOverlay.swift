import SwiftUI

struct SearchOverlayView: View {
    @ObservedObject var session: TerminalSession
    @Binding var isPresented: Bool
    @State private var searchText = ""
    @State private var caseSensitive = false
    @State private var useRegex = false
    @State private var matches: [SearchMatch] = []
    @State private var currentMatchIndex = 0
    
    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 12) {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(Color(hex: Settings.shared.theme.foreground).opacity(0.5))
                
                TextField("Search...", text: $searchText)
                    .textFieldStyle(.plain)
                    .font(.system(size: 14))
                    .foregroundColor(Color(hex: Settings.shared.theme.foreground))
                    .onChange(of: searchText) { _, _ in
                        performSearch()
                    }
                
                Divider()
                    .frame(height: 20)
                
                Toggle(isOn: $caseSensitive) {
                    Text("Aa")
                        .font(.system(size: 12, weight: .medium))
                }
                .toggleStyle(.button)
                .buttonStyle(.plain)
                .foregroundColor(Color(hex: Settings.shared.theme.foreground).opacity(0.7))
                
                Toggle(isOn: $useRegex) {
                    Text(".*")
                        .font(.system(size: 12, weight: .medium))
                }
                .toggleStyle(.button)
                .buttonStyle(.plain)
                .foregroundColor(Color(hex: Settings.shared.theme.foreground).opacity(0.7))
                
                if !matches.isEmpty {
                    Text("\(currentMatchIndex + 1)/\(matches.count)")
                        .font(.system(size: 12, design: .monospaced))
                        .foregroundColor(Color(hex: Settings.shared.theme.foreground).opacity(0.6))
                }
                
                Button(action: { isPresented = false }) {
                    Image(systemName: "xmark")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(Color(hex: Settings.shared.theme.foreground).opacity(0.5))
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
        }
        .background(Color(hex: Settings.shared.theme.black))
    }
    
    private func performSearch() {
        matches = []
        guard !searchText.isEmpty else { return }
        
        let screen = session.buffer.getVisibleBuffer()
        
        for (y, row) in screen.enumerated() {
            let line = String(row.map { $0.character })
            for (x, cell) in row.enumerated() {
                
                var searchIn = line
                var searchFor = searchText
                
                if useRegex {
                    do {
                        let options: NSRegularExpression.Options = caseSensitive ? [] : .caseInsensitive
                        let regex = try NSRegularExpression(pattern: searchText, options: options)
                        let range = NSRange(searchIn.startIndex..., in: searchIn)
                        let regexMatches = regex.matches(in: searchIn, range: range)
                        
                        for match in regexMatches {
                            let matchRange = Range(match.range, in: searchIn)!
                            matches.append(SearchMatch(x: searchIn.distance(from: searchIn.startIndex, to: matchRange.lowerBound), y: y))
                        }
                    } catch {
                        break
                    }
                } else {
                    var searchRange = searchIn.startIndex..<searchIn.endIndex
                    
                    while let range = searchIn.range(of: searchFor, options: caseSensitive ? [] : .caseInsensitive, range: searchRange) {
                        let xPos = searchIn.distance(from: searchIn.startIndex, to: range.lowerBound)
                        matches.append(SearchMatch(x: xPos, y: y))
                        
                        searchRange = range.upperBound..<searchIn.endIndex
                    }
                }
            }
        }
        
        if !matches.isEmpty {
            currentMatchIndex = 0
        }
    }
}

struct SearchMatch {
    let x: Int
    let y: Int
}