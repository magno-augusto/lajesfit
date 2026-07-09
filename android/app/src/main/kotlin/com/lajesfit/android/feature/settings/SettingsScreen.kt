package com.lajesfit.android.feature.settings

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.NotificationsOff
import androidx.compose.material.icons.filled.Password
import androidx.compose.material.icons.filled.PhotoCamera
import androidx.compose.material.icons.filled.Public
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import coil3.compose.AsyncImage
import com.lajesfit.android.ui.theme.LajesFitTheme

@Composable
fun SettingsScreen(
    onLoggedOut: () -> Unit,
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

    LaunchedEffect(uiState.loggedOut) {
        if (uiState.loggedOut) onLoggedOut()
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
        onNotificationsEnabledChange = viewModel::updateNotificationsEnabled,
        onNotificationPreferenceChange = viewModel::updateNotificationPreference,
        onCurrentPasswordChange = viewModel::onCurrentPasswordChange,
        onNewPasswordChange = viewModel::onNewPasswordChange,
        onConfirmPasswordChange = viewModel::onConfirmPasswordChange,
        onSavePassword = viewModel::savePassword,
        onRecoveryEmailChange = viewModel::onRecoveryEmailChange,
        onSaveRecoveryEmail = viewModel::saveRecoveryEmail,
        onLogout = viewModel::logout,
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
    onNotificationsEnabledChange: (Boolean) -> Unit,
    onNotificationPreferenceChange: (NotificationPreference, Boolean) -> Unit,
    onCurrentPasswordChange: (String) -> Unit,
    onNewPasswordChange: (String) -> Unit,
    onConfirmPasswordChange: (String) -> Unit,
    onSavePassword: () -> Unit,
    onRecoveryEmailChange: (String) -> Unit,
    onSaveRecoveryEmail: () -> Unit,
    onLogout: () -> Unit,
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
                contentPadding = PaddingValues(bottom = 24.dp),
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
                        StatusMessageCard(message = message, isError = true)
                    }
                }
                uiState.successMessage?.let { message ->
                    item {
                        StatusMessageCard(message = message, isError = false)
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

                item {
                    NotificationsCard(
                        uiState = uiState,
                        onNotificationsEnabledChange = onNotificationsEnabledChange,
                        onNotificationPreferenceChange = onNotificationPreferenceChange,
                    )
                }

                item {
                    SecurityCard(
                        uiState = uiState,
                        onCurrentPasswordChange = onCurrentPasswordChange,
                        onNewPasswordChange = onNewPasswordChange,
                        onConfirmPasswordChange = onConfirmPasswordChange,
                        onSavePassword = onSavePassword,
                        onRecoveryEmailChange = onRecoveryEmailChange,
                        onSaveRecoveryEmail = onSaveRecoveryEmail,
                    )
                }

                item {
                    LogoutCard(
                        isLoggingOut = uiState.isLoggingOut,
                        onLogout = onLogout,
                    )
                }
            }
        }
    }
}

@Composable
private fun StatusMessageCard(message: String, isError: Boolean) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(
            containerColor = if (isError) {
                MaterialTheme.colorScheme.errorContainer
            } else {
                MaterialTheme.colorScheme.secondaryContainer
            },
        ),
    ) {
        Text(
            text = message,
            color = if (isError) {
                MaterialTheme.colorScheme.onErrorContainer
            } else {
                MaterialTheme.colorScheme.onSecondaryContainer
            },
            modifier = Modifier.padding(14.dp),
        )
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
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
    ) {
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
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
    ) {
        SettingsSwitchRow(
            icon = {
                Icon(
                    imageVector = if (isPrivate) Icons.Filled.Lock else Icons.Filled.Public,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                )
            },
            title = "Privacidade",
            description = if (isPrivate) {
                "Publicacoes visiveis para seguidores aprovados."
            } else {
                "Publicacoes visiveis no feed."
            },
            checked = !isPrivate,
            onCheckedChange = { checked -> onPrivacyChange(!checked) },
            enabled = !isSaving,
            modifier = Modifier.padding(16.dp),
        )
    }
}

@Composable
private fun NotificationsCard(
    uiState: SettingsUiState,
    onNotificationsEnabledChange: (Boolean) -> Unit,
    onNotificationPreferenceChange: (NotificationPreference, Boolean) -> Unit,
) {
    val items = listOf(
        NotificationPreferenceUi(
            preference = NotificationPreference.Likes,
            title = "Curtidas",
            description = "Quando curtirem suas publicacoes.",
            checked = uiState.notifyLikes,
        ),
        NotificationPreferenceUi(
            preference = NotificationPreference.Comments,
            title = "Comentarios",
            description = "Quando comentarem nas suas publicacoes.",
            checked = uiState.notifyComments,
        ),
        NotificationPreferenceUi(
            preference = NotificationPreference.Follows,
            title = "Novos seguidores",
            description = "Quando alguem comecar a seguir voce.",
            checked = uiState.notifyFollows,
        ),
        NotificationPreferenceUi(
            preference = NotificationPreference.Challenges,
            title = "Rank do desafio",
            description = "Novatos no rank e quando tomarem sua lideranca.",
            checked = uiState.notifyChallenges,
        ),
    )

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            SettingsSwitchRow(
                icon = {
                    Icon(
                        imageVector = if (uiState.notificationsEnabled) {
                            Icons.Filled.Notifications
                        } else {
                            Icons.Filled.NotificationsOff
                        },
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                    )
                },
                title = "Notificacoes",
                description = if (uiState.notificationsEnabled) {
                    "Voce recebe notificacoes conforme os tipos abaixo."
                } else {
                    "Nenhum aviso sera gerado para voce."
                },
                checked = uiState.notificationsEnabled,
                onCheckedChange = onNotificationsEnabledChange,
                enabled = !uiState.isSavingNotificationsEnabled,
            )
            HorizontalDivider()
            items.forEach { item ->
                SettingsSwitchRow(
                    title = item.title,
                    description = item.description,
                    checked = item.checked,
                    onCheckedChange = { checked ->
                        onNotificationPreferenceChange(item.preference, checked)
                    },
                    enabled = uiState.notificationsEnabled &&
                        uiState.savingNotificationPreference != item.preference,
                )
            }
        }
    }
}

@Composable
private fun SecurityCard(
    uiState: SettingsUiState,
    onCurrentPasswordChange: (String) -> Unit,
    onNewPasswordChange: (String) -> Unit,
    onConfirmPasswordChange: (String) -> Unit,
    onSavePassword: () -> Unit,
    onRecoveryEmailChange: (String) -> Unit,
    onSaveRecoveryEmail: () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Icon(Icons.Filled.Password, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                Column {
                    Text("Seguranca", style = MaterialTheme.typography.titleMedium)
                    Text(
                        "Troque sua senha ou cadastre um e-mail real da conta.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            if (uiState.hasPasswordLogin) {
                OutlinedTextField(
                    value = uiState.currentPassword,
                    onValueChange = onCurrentPasswordChange,
                    label = { Text("Senha atual") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                )
            } else {
                Text(
                    text = "Sua conta ainda nao tem senha. Defina uma para tambem entrar com usuario e senha.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            OutlinedTextField(
                value = uiState.newPassword,
                onValueChange = onNewPasswordChange,
                label = { Text("Nova senha") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            )
            OutlinedTextField(
                value = uiState.confirmPassword,
                onValueChange = onConfirmPasswordChange,
                label = { Text("Confirmar senha") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            )
            OutlinedButton(
                onClick = onSavePassword,
                enabled = !uiState.isSavingPassword,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(
                    when {
                        uiState.isSavingPassword -> "Salvando..."
                        uiState.hasPasswordLogin -> "Trocar senha"
                        else -> "Definir senha"
                    },
                )
            }

            HorizontalDivider()

            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                Icon(Icons.Filled.Email, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                Column {
                    Text("E-mail da conta", style = MaterialTheme.typography.titleMedium)
                    Text(
                        text = uiState.currentEmail ?: "Nenhum e-mail real cadastrado ainda.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    uiState.pendingEmail?.let { pending ->
                        Text(
                            text = "Confirmacao pendente para $pending.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
            OutlinedTextField(
                value = uiState.recoveryEmail,
                onValueChange = onRecoveryEmailChange,
                label = { Text("E-mail") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            )
            OutlinedButton(
                onClick = onSaveRecoveryEmail,
                enabled = !uiState.isSavingEmail,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(if (uiState.isSavingEmail) "Salvando..." else "Salvar e-mail")
            }
        }
    }
}

@Composable
private fun LogoutCard(
    isLoggingOut: Boolean,
    onLogout: () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
    ) {
        Button(
            onClick = onLogout,
            enabled = !isLoggingOut,
            colors = ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.error,
                contentColor = MaterialTheme.colorScheme.onError,
            ),
            modifier = Modifier.fillMaxWidth().padding(16.dp),
        ) {
            Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null, modifier = Modifier.padding(end = 8.dp))
            Text(if (isLoggingOut) "Saindo..." else "Sair da conta")
        }
    }
}

@Composable
private fun SettingsSwitchRow(
    title: String,
    description: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    enabled: Boolean,
    modifier: Modifier = Modifier,
    icon: (@Composable () -> Unit)? = null,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(
            modifier = Modifier.weight(1f),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            icon?.invoke()
            Column {
                Text(title, style = MaterialTheme.typography.titleMedium)
                Text(
                    text = description,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            enabled = enabled,
        )
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

private data class NotificationPreferenceUi(
    val preference: NotificationPreference,
    val title: String,
    val description: String,
    val checked: Boolean,
)

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
                    notifyFollows = false,
                    notifyChallenges = true,
                ),
                displayName = "Magno",
                bio = "Treinos e dieta.",
                isPrivate = true,
                notificationsEnabled = true,
                notifyLikes = true,
                notifyComments = true,
                notifyFollows = false,
                notifyChallenges = true,
                hasPasswordLogin = true,
                currentEmail = "magno@email.com",
                pendingEmail = null,
                recoveryEmail = "magno@email.com",
                isLoading = false,
            ),
            onDisplayNameChange = {},
            onBioChange = {},
            onSaveProfile = {},
            onPickAvatar = {},
            onPrivacyChange = {},
            onNotificationsEnabledChange = {},
            onNotificationPreferenceChange = { _, _ -> },
            onCurrentPasswordChange = {},
            onNewPasswordChange = {},
            onConfirmPasswordChange = {},
            onSavePassword = {},
            onRecoveryEmailChange = {},
            onSaveRecoveryEmail = {},
            onLogout = {},
        )
    }
}
