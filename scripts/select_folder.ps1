param(
    [string]$InitialPath = ""
)

try {
    Add-Type -AssemblyName System.Windows.Forms

    $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
    $dialog.Description = "OpenCode Project Folder ကို ရွေးချယ်ပါ"
    $dialog.ShowNewFolderButton = $true

    if ($InitialPath -and (Test-Path -LiteralPath $InitialPath)) {
        $dialog.SelectedPath = $InitialPath
    }

    # Clean topmost anchor form so dialog pops in front of Edge/browser
    $form = New-Object System.Windows.Forms.Form
    $form.TopMost = $true
    $form.ShowInTaskbar = $false
    $form.Width = 1
    $form.Height = 1
    $form.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
    $form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
    $form.Show()
    $form.BringToFront()

    $result = $dialog.ShowDialog($form)
    $form.Close()
    $form.Dispose()

    if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
        [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
        [Console]::WriteLine($dialog.SelectedPath)
    }
} catch {
    # Report the failure on stderr so /api/browse-folder can surface it instead of
    # treating it as a user cancel (see the `code !== 0 && stderrData` branch).
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
}
