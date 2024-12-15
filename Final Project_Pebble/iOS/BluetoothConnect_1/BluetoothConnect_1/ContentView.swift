import SwiftUI

struct ContentView: View {
    @StateObject var bleManager = BLEManager()
    
    var body: some View {
        VStack(spacing: 20) {
            if bleManager.isConnected {
                Text("Connected to ESP32!")
                    .font(.title)
                    .foregroundColor(.green)
                
                Text("Last Button Press: \(bleManager.lastButtonPress)")
                    .font(.headline)
                    .padding()
                
                Button(action: {
                    bleManager.sendVibrateCommand()
                }) {
                    Text("Vibrate")
                        .font(.headline)
                        .foregroundColor(.white)
                        .padding()
                        .background(Color.blue)
                        .cornerRadius(8)
                }
                
            } else {
                Text("Scanning for ESP32...")
                    .font(.headline)
                    .foregroundColor(.gray)
            }
        }
        .padding()
    }
}


