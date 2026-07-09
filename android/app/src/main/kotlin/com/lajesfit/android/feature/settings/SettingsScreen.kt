package com.lajesfit.android.feature.settings

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material.icons.filled.Public
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil3.compose.AsyncImage
import com.lajesfit.android.ui.theme.LajesFitTheme

@Composable
fun SettingsScreen(
    modifier: Modifier = Modifier,
    viewModel: SettingsViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val photoPicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia(),
    ) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        val bytes = runCatching {
            context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
        }.getOrNull()
        if (bytes == null) {
            viewModel.showError("Nao foi possivel ler a imagem")
        } else {
            viewModel.uploadAvatar(bytes)
        }
    }

    SettingsScreenContent(
        uiState = uiState,
        onDisplayNameChange = viewModel::onDisplayNameChange,
        onBioChange = viewModel::onBioChange,
        onSaveProfile = viewModel::saveProfile,
        onPickAvatar = {
            photoPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
        },
        onPrivacyChange = viewModel::updatePrivacy,
        modifier = modifier,
    )
}

@Composable
private fun SettingsScreenContent(
    uiState: SettingsUiState,
    onDisplayNameChange: (String) -> Unit,
    onBioChange: (String) -> Unit,
    onSaveProfile: () -> Unit,
    onPickAvatar: () -> Unit,
    onPrivacyChange: (Boolean) -> Unit,
    modifier: Modifier = Modifier,
) {
    when {
        uiState.isLoading -> {
            Column(
                modifier = modifier.fillMaxSize().padding(24.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                CircularProgressIndicator(modifier = Modifier.padding(bottom = 8.dp))
                Text("Carregando configuracoes...")
            }
        }
        uiState.settings == null -> {
            Box(modifier = modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
                Text(uiState.errorMessage ?: "Nao foi possivel carregar configuracoes", textAlign = TextAlign.Center)
            }
        }
        else -> {
            LazyColumn(
                modifier = modifier.fillMaxSize().padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                item {
                    Text(
                        text = "Configuracoes",
                        style = MaterialTheme.typography.headlineMedium,
                        modifier = Modifier.padding(top = 16.dp),
                    )
                }

                uiState.errorMessage?.let { message ->
                    item {
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Text(message, color = MaterialTheme.colorScheme.error, modifier = Modifier.padding(14.dp))
                        }
                    }
                }
                uiState.successMessage?.let { message ->
                    item {
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Text(
                                message,
                                color = MaterialTheme.colorScheme.primary,
                                modifier = Modifier.padding(14.dp),
                            )
                        }
                    }
                }

                item {
                    ProfileSettingsCard(
                        uiState = uiState,
                        onDisplayNameChange = onDisplayNameChange,
                        onBioChange = onBioChange,
                        onSaveProfile = onSaveProfile,
                        onPickAvatar = onPickAvatar,
                    )
                }

                item {
                    PrivacyCard(
                        isPrivate = uiState.isPrivate,
                        isSaving = uiState.isSavingPrivacy,
                        onPrivacyChange = onPrivacyChange,
                    )
                }
            }
        }
    }
}

@Composable
private fun ProfileSettingsCard(
    uiState: SettingsUiState,
    onDisplayNameChange: (String) -> Unit,
    onBioChange: (String) -> Unit,
    onSaveProfile: () -> Unit,
    onPickAvatar: () -> Unit,
) {
    val settings = uiState.settings ?: return
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                SettingsAvatar(uiState.avatarUrl, uiState.displayName, modifier = Modifier.size(72.dp))
                OutlinedButton(onClick = onPickAvatar, enabled = !uiState.isUploadingAvatar) {
                    Icon(Icons.Filled.PhotoCamera, contentDescription = null, modifier = Modifier.padding(end = 8.dp))
                    Text(if (uiState.isUploadingAvatar) "Enviando..." else "Trocar foto")
                }
            }
            OutlinedTextField(
                value = settings.username,
                onValueChange = {},
                enabled = false,
                label = { Text("Usuario") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
            OutlinedTextField(
                value = uiState.displayName,
                onValueChange = onDisplayNameChange,
                label = { Text("Nome") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Words),
            )
            OutlinedTextField(
                value = uiState.bio,
                onValueChange = onBioChange,
                label = { Text("Bio") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 3,
                maxLines = 5,
                keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Sentences),
            )
            Button(
                onClick = onSaveProfile,
                enabled = !uiState.isSavingProfile,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(if (uiState.isSavingProfile) "Salvando..." else "Salvar")
            }
        }
    }
}

@Composable
private fun PrivacyCard(
    isPrivate: Boolean,
    isSaving: Boolean,
    onPrivacyChange: (Boolean) -> Unit,
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(
                modifier = Modifier.weight(1f),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Icon(
                    imageVector = if (isPrivate) Icons.Filled.Lock else Icons.Filled.Public,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                )
                Column {
                    Text("Privacidade", style = MaterialTheme.typography.titleMedium)
                    Text(
                        text = if (isPrivate) {
                            "Publicacoes visiveis para seguidores aprovados."
                        } else {
                            "Publicacoes visiveis no feed."
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            Switch(
                checked = !isPrivate,
                onCheckedChange = { checked -> onPrivacyChange(!checked) },
                enabled = !isSaving,
            )
        }
    }
}

@Composable
private fun SettingsAvatar(avatarUrl: String?, fallbackName: String, modifier: Modifier = Modifier) {
    if (avatarUrl != null) {
        AsyncImage(
            model = avatarUrl,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = modifier.clip(CircleShape),
        )
    } else {
        Box(
            modifier = modifier.clip(CircleShape).background(MaterialTheme.colorScheme.primaryContainer),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                fallbackName.take(1).uppercase().ifBlank { "?" },
                style = MaterialTheme.typography.headlineSmall,
                color = MaterialTheme.colorScheme.onPrimaryContainer,
            )
        }
    }
}

@Preview(showBackground = true)
@Composable
private fun SettingsScreenPreview() {
    LajesFitTheme {
        SettingsScreenContent(
            uiState = SettingsUiState(
                settings = ProfileSettings(
                    username = "magno",
                    displayName = "Magno",
                    bio = "Treinos e dieta.",
                    avatarUrl = null,
                    recoveryEmail = null,
                    isAdmin = false,
                    isPrivate = true,
                    notificationsEnabled = true,
                    notifyLikes = true,
                    notifyComments = true,
                    notifyFollows = true,
                    notifyChallenges = true,
                ),
                displayName = "Magno",
                bio = "Treinos e dieta.",
                isPrivate = true,
                isLoading = false,
            ),
            onDisplayNameChange = {},
            onBioChange = {},
            onSaveProfile = {},
            onPickAvatar = {},
            onPrivacyChange = {},
        )
    }
}
