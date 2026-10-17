param(
    [string]$InitialPath = ""
)

try {
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing

    $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
    $dialog.Description = "OpenCode အသုံးပြုလိုသည့် Project Folder ကို ရွေးချယ်ပါ"
    $dialog.ShowNewFolderButton = $true

    if ($InitialPath -and (Test-Path $InitialPath)) {
        $dialog.SelectedPath = $InitialPath
    }

    # Invisible topmost owner form to bring dialog to front
    $form = New-Object System.Windows.Forms.Form
    $form.TopMost = $true
    $form.ShowInTaskbar = $false
    $form.Size = New-Object System.Drawing.Size(0,0)
    $form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
    $form.Opacity = 0
    $form.Show()
    $form.BringToFront()

    $result = $dialog.ShowDialog($form)
    $form.Dispose()

    if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
        [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
        Write-Output $dialog.SelectedPath
    }
} catch {
    # If any error, exit quietly
    exit 1
}
